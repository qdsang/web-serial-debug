package bridge

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/tarm/serial"
	"github.com/webview/webview_go"
)

type SerialManager struct {
	view webview.WebView
	port *serial.Port
	mux  sync.Mutex
}

func NewSerialManager(view webview.WebView) *SerialManager {
	return &SerialManager{view: view}
}

func (s *SerialManager) GetPorts() []string {
	var ports []string

	switch runtime.GOOS {
	case "windows":
		for i := 1; i <= 256; i++ {
			ports = append(ports, fmt.Sprintf("COM%d", i))
		}
	case "darwin":
		filepath.Walk("/dev", func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			name := filepath.Base(path)
			if len(name) > 3 && (name[:4] == "tty." || name[:3] == "cu.") {
				ports = append(ports, path)
			}
			return nil
		})
	case "linux":
		filepath.Walk("/dev", func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			name := filepath.Base(path)
			if len(name) > 3 && (name[:4] == "ttyS" || name[:4] == "ttyUSB" || name[:4] == "ttyACM" || name[:7] == "ttyAMA") {
				ports = append(ports, path)
			}
			return nil
		})
	}

	return ports
}

// 初始化串口
func (s *SerialManager) InitSerial(portName string, baudRate int) error {
	s.mux.Lock()
	defer s.mux.Unlock()

	if s.port != nil {
		s.port.Close()
	}

	c := &serial.Config{
		Name: portName,
		Baud: baudRate,
	}

	port, err := serial.OpenPort(c)
	if err != nil {
		return err
	}

	s.port = port
	return nil
}

// 写入串口数据
func (s *SerialManager) WriteSerial(data []byte) error {
	if s.port == nil {
		return fmt.Errorf("serial port not initialized")
	}

	_, err := s.port.Write(data)
	return err
}

// 读取串口数据
func (s *SerialManager) ReadSerial(callback string) {
	if s.port == nil {
		return
	}

	go func() {
		buf := make([]byte, 128)
		for {
			n, err := s.port.Read(buf)
			if err != nil {
				log.Printf("Error reading from serial: %v", err)
				return
			}
			if n > 0 {
				data := buf[:n]
				s.view.Eval(fmt.Sprintf("%s(%s)", callback, string(data)))
			}
		}
	}()
}