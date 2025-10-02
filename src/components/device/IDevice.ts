export interface IDevice {
  /**
   * 设备唯一标识符
   */
  id: string;
  
  /**
   * 设备显示名称
   */
  title: string;
  
  /**
   * 设备类型
   */
  type: string;
  
  /**
   * 底层设备对象
   */
  port: any;

  /**
   * 初始化设备
   */
  init?(): Promise<void>;

  /**
   * 请求用户授权设备
   */
  request(): Promise<IDevice | null>;

  /**
   * 连接设备
   */
  connect(config?: any): Promise<{ writer: WritableStreamDefaultWriter, reader: ReadableStreamDefaultReader } | null>;

  /**
   * 断开设备连接
   */
  disconnect(): Promise<void>;

  /**
   * 获取设备信息
   */
  getInfo(): DeviceInfo;
}

export interface DeviceInfo {
  /**
   * 设备制造商
   */
  manufacturer?: string;
  
  /**
   * 设备产品名称
   */
  productName?: string;
  
  /**
   * 设备序列号
   */
  serialNumber?: string;
  
  /**
   * USB厂商ID
   */
  vendorId?: number;
  
  /**
   * USB产品ID
   */
  productId?: number;
}