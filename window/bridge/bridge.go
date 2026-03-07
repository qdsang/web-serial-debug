package bridge

import (
	"time"
	"github.com/influxdata/influxdb-client-go/v2"
	"github.com/webview/webview_go"
)

type Bridge struct {
	view           webview.WebView
	serialManager  *SerialManager
	storageManager *StorageManager
	fileManager    *FileManager
	config         *Config
}

func New(view webview.WebView) *Bridge {
	return &Bridge{
		view:           view,
		serialManager:  NewSerialManager(view),
		fileManager:    NewFileManager(),
		storageManager: NewStorageManager(nil, nil),
	}
}

// 设置配置信息
func (b *Bridge) SetConfig(config interface{}) {
	b.config = config.(*Config)
	b.storageManager.config = b.config
}

// 设置InfluxDB客户端
func (b *Bridge) SetInfluxClient(client influxdb2.Client) {
	b.storageManager.SetInfluxClient(client)
}

// 初始化串口
func (b *Bridge) InitSerial(portName string, baudRate int) error {
	return b.serialManager.InitSerial(portName, baudRate)
}

// 写入串口数据
func (b *Bridge) WriteSerial(data []byte) error {
	return b.serialManager.WriteSerial(data)
}

// 读取串口数据
func (b *Bridge) ReadSerial(callback string) {
	b.serialManager.ReadSerial(callback)
}

// 获取可用串口列表
func (b *Bridge) GetSerialPorts() []string {
	return b.serialManager.GetPorts()
}

// 保存数据点
func (b *Bridge) SaveDataPoint(measurement string, tags map[string]string, fields map[string]interface{}) error {
	return b.storageManager.SaveDataPoint(measurement, tags, fields)
}

// 查询数据
func (b *Bridge) QueryData(measurement string, start, end interface{}) ([]map[string]interface{}, error) {
	startTime, _ := time.Parse(time.RFC3339, start.(string))
	endTime, _ := time.Parse(time.RFC3339, end.(string))
	return b.storageManager.QueryData(measurement, startTime, endTime)
}

// 保存文件
func (b *Bridge) SaveFile(path string, data string) error {
	return b.fileManager.SaveFile(path, data)
}

// 读取文件
func (b *Bridge) ReadFile(path string) (string, error) {
	return b.fileManager.ReadFile(path)
}

// 列出目录内容
func (b *Bridge) ListDirectory(path string) ([]string, error) {
	return b.fileManager.ListDirectory(path)
}