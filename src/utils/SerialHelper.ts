
import { EventCenter, EventNames } from '../utils/EventCenter'

const eventCenter = EventCenter.getInstance()

export class SerialHelper {
  private static instance: SerialHelper;
  private textEncoder: TextEncoder;
  private textDecoder: TextDecoder;
  private isConnected: boolean = false;
  private sendQueue: Array<Uint8Array> = [];
  private readonly maxQueueSize: number = 1000;
  private processingQueue: boolean = false;

  private constructor() {
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();
  }

  public static getInstance(): SerialHelper {
    if (!SerialHelper.instance) {
      SerialHelper.instance = new SerialHelper();
    }
    return SerialHelper.instance;
  }

  public setConnected(status: boolean): void {
    this.isConnected = status;
    if (!status) {
      this.clearSendQueue();
    }
  }

  public isSerialConnected(): boolean {
    return this.isConnected;
  }

  public validateHexString(str: string): boolean {
    const hexRegex = /^[0-9A-Fa-f\s]*$/;
    return hexRegex.test(str) && str.replace(/\s/g, '').length % 2 === 0;
  }

  public stringToUint8Array(str: string, isHex: boolean = false): Uint8Array {
    if (isHex) {
      if (!this.validateHexString(str)) {
        throw new Error('无效的HEX格式字符串');
      }
      const hexStr = str.replace(/[^0-9A-Fa-f]/g, '');
      const bytes = new Uint8Array(hexStr.length / 2);
      for (let i = 0; i < hexStr.length; i += 2) {
        bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
      }
      return bytes;
    }
    return this.textEncoder.encode(str);
  }

  public uint8ArrayToHexString(data: Uint8Array): string {
    return Array.from(data)
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  public uint8ArrayToString(data: Uint8Array): string {
    try {
      return this.textDecoder.decode(data);
    } catch (error) {
      console.error('解码数据时出错:', error);
      return '';
    }
  }

  public formatLogMessage(data: Uint8Array, options: {
    showTime: boolean
    showMs: boolean
    showHex: boolean
    showText: boolean
    showNewline: boolean
  }): string {
    try {
      const now = new Date();
      const parts: string[] = [];

      if (options.showTime) {
        const timeStr = now.toLocaleTimeString();
        if (options.showMs) {
          const ms = now.getMilliseconds().toString().padStart(3, '0');
          parts.push(`[${timeStr}.${ms}]`);
        } else {
          parts.push(`[${timeStr}]`);
        }
      }

      if (options.showHex) {
        const hexStr = this.uint8ArrayToHexString(data);
        parts.push(hexStr);
      }

      if (options.showText) {
        const textStr = this.uint8ArrayToString(data);
        if (options.showHex) {
          parts.push(`| ${textStr}`);
        } else {
          parts.push(textStr);
        }
      }

      if (options.showNewline) {
        parts.push('\r\n');
      } else {
        parts.push('');
      }

      const message = parts.join(' ');
      return message;
    } catch (error) {
      console.error('格式化日志消息时出错:', error);
      return `[${new Date().toLocaleTimeString()}] 错误: 无法格式化消息\n`;
    }
  }

  public async addToSendQueue(data: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('串口未连接');
    }

    if (this.sendQueue.length >= this.maxQueueSize) {
      throw new Error('发送队列已满');
    }

    this.sendQueue.push(data);
    if (!this.processingQueue) {
      await this.processSendQueue();
    }
  }

  private clearSendQueue(): void {
    this.sendQueue = [];
    this.processingQueue = false;
  }

  private async processSendQueue(): Promise<void> {
    if (this.processingQueue || this.sendQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    while (this.sendQueue.length > 0 && this.isConnected) {
      const data = this.sendQueue.shift();
      if (data) {
        try {
          // 触发发送事件
          eventCenter.emit(EventNames.SERIAL_SEND, data)
          // 添加适当的延迟以防止数据发送过快
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.error('发送数据时出错:', error);
        }
      }
    }
    this.processingQueue = false;
  }

  public calculateChecksum(data: Uint8Array): number {
    return data.reduce((sum, byte) => sum ^ byte, 0);
  }

  public appendChecksum(data: Uint8Array): Uint8Array {
    const checksum = this.calculateChecksum(data);
    const result = new Uint8Array(data.length + 1);
    result.set(data);
    result[data.length] = checksum;
    return result;
  }

  public verifyChecksum(data: Uint8Array): boolean {
    if (data.length < 1) return false;
    const receivedChecksum = data[data.length - 1];
    const calculatedChecksum = this.calculateChecksum(data.slice(0, -1));
    return receivedChecksum === calculatedChecksum;
  }
}