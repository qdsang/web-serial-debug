package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"window/bridge"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	webview "github.com/webview/webview_go"
)

func findAvailablePort() (net.Listener, error) {
	l, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return nil, err
	}
	return l, nil
}

// 这些变量会在编译时通过 -ldflags 注入
// go build -ldflags "-X main.buildTime=$(date) -X main.version=1.0.0"
var (
	buildTime = "unknown"
	version   = "dev"
)

// GetVersionInfo 返回版本信息
func getVersionInfo() map[string]string {
	return map[string]string{
		"buildTime": buildTime,
		"version":   version,
	}
}

func main() {
	debug := flag.Bool("debug", false, "Enable debug mode")
	useInfluxDB := flag.Bool("use-influxdb", false, "Use InfluxDB instead of embedded database")
	influxDBURL := flag.String("influxdb-url", "http://localhost:8086", "InfluxDB server URL")
	influxDBToken := flag.String("influxdb-token", "", "InfluxDB authentication token")
	influxDBOrg := flag.String("influxdb-org", "myorg", "InfluxDB organization")
	influxDBBucket := flag.String("influxdb-bucket", "mybucket", "InfluxDB bucket")
	flag.Parse()

	// 初始化配置
	config := bridge.NewConfig()
	config.UseInfluxDB = *useInfluxDB
	config.InfluxDBURL = *influxDBURL
	config.InfluxDBToken = *influxDBToken
	config.InfluxDBOrg = *influxDBOrg
	config.InfluxDBBucket = *influxDBBucket

	// 如果使用InfluxDB，初始化客户端连接
	var influxClient influxdb2.Client
	if config.UseInfluxDB {
		influxClient = influxdb2.NewClient(config.InfluxDBURL, config.InfluxDBToken)
		defer influxClient.Close()

		// 测试连接
		health, err := influxClient.Health(context.Background())
		if err != nil {
			log.Printf("Warning: Failed to connect to InfluxDB: %v", err)
		} else {
			log.Printf("Connected to InfluxDB %s", health.Version)
		}
	}

	// 创建webview实例
	w := webview.New(*debug)
	defer w.Destroy()

	// 设置窗口标题和大小
	w.SetTitle("BUS Tool")
	w.SetSize(1024, 768, webview.HintNone)

	// 创建bridge实例，传入数据库配置
	b := bridge.New(w)
	b.SetConfig(config)
	if config.UseInfluxDB {
		b.SetInfluxClient(influxClient)
	}

	// 注册串口相关的JavaScript桥接函数
	w.Bind("initSerial", b.InitSerial)
	w.Bind("writeSerial", b.WriteSerial)
	w.Bind("readSerial", b.ReadSerial)
	w.Bind("getSerialPorts", b.GetSerialPorts)

	// 注册文件操作相关的JavaScript桥接函数
	w.Bind("saveFile", b.SaveFile)
	w.Bind("readFile", b.ReadFile)
	w.Bind("listDirectory", b.ListDirectory)

	// 注册数据存储相关的JavaScript桥接函数
	w.Bind("saveDataPoint", b.SaveDataPoint)
	w.Bind("queryData", b.QueryData)

	// 注册版本信息相关的JavaScript桥接函数
	w.Bind("getVersionInfo", getVersionInfo)

	// 获取应用资源路径
	var resourcePath string
	if *debug {
		resourcePath = "http://localhost:5173"
	} else {
		exePath, err := os.Executable()
		if err != nil {
			log.Fatal(err)
		}
		resourceDir := filepath.Dir(exePath)
		distDir := filepath.Join(resourceDir, "dist")

		ln, err := findAvailablePort()
		if err != nil {
			log.Fatal(err)
		}

		basePath := "/web-serial-debug"
		go func() {
			mux := http.NewServeMux()
			mux.Handle(basePath+"/", http.StripPrefix(basePath, http.FileServer(http.Dir(distDir))))
			mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/" || r.URL.Path == basePath {
					http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
				} else {
					http.ServeFile(w, r, filepath.Join(distDir, r.URL.Path))
				}
			})
			if err := http.Serve(ln, mux); err != nil {
				log.Printf("HTTP server error: %v", err)
			}
		}()

		resourcePath = fmt.Sprintf("http://localhost:%d%s", ln.Addr().(*net.TCPAddr).Port, basePath)
		log.Printf("Serving frontend at %s", resourcePath)
	}

	// 加载前端页面
	w.Navigate(resourcePath)

	// 运行主循环
	w.Run()
}
