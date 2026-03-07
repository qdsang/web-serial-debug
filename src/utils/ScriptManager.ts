import { SerialHelper } from './SerialHelper'
import { useFieldStore } from '../store/fieldStore'
import { EventCenter, EventNames } from '../utils/EventCenter'
import { ProfileManagerInst } from './ProfileManager'

const eventCenter = EventCenter.getInstance()

export interface ScriptItem {
  id: number
  name: string
  code: string
  isRunning: boolean
}

export interface Runtimer {
  DataReceiverInterface: Function | null,
  DataSenderInterface: Function | null
}

const demo1 = `let cache = '';

// 处理接收的数据
async function DataReceiver(data) {
  cache += uint8ArrayToString(data);
  // 数据格式："pitch:-0.13,roll:0.00,yaw:0.07\\n"

  if (cache.indexOf('\\n') !== -1) {
    const lines = cache.split('\\n');
    cache = lines.pop() || '';
    
    for (const line of lines) {
      let files = line.split(',')
      let data = {};
      files.map((str) => {
        let s2 = str.split(':')
        if (s2.length === 2) {
          data[s2[0]] = parseFloat(s2[1])
        }
      })
      
      // 更新到数据表
      updateDataTable(data);
    }
  }
  return data;
}

// 处理发送的数据
async function DataSender(data) {
  // checksum
  // await sleep(10);

  return data;
}

// 定时发送数据
setInterval(async () => {
  const bytes = new Uint8Array(3);
  // sendHex(bytes);
}, 1000);

// 支持的函数
// stringToUint8Array();
// uint8ArrayToHexString();
// uint8ArrayToString();

`;


export class ScriptManager {
  private static instance: ScriptManager
  private scripts: ScriptItem[] = []
  public currentScript: ScriptItem = {
    id: Date.now(),
    name: '新建脚本',
    code: '',
    isRunning: false
  }
  private serialHelper = SerialHelper.getInstance()
  private profileManager = ProfileManagerInst

  private runtimer: Runtimer = {
    DataReceiverInterface: null,
    DataSenderInterface: null
  }
  private RuntimerTimerIntervals: number[] = []
  private RuntimerTimerouts: number[] = []

  private constructor() {
    this.loadScripts()
  }

  public static getInstance(): ScriptManager {
    if (!ScriptManager.instance) {
      ScriptManager.instance = new ScriptManager()
    }
    return ScriptManager.instance
  }

  public getScripts(): ScriptItem[] {
    return this.scripts
  }

  public getCurrentScript(): ScriptItem {
    return this.currentScript
  }

  public setCurrentScript(script: ScriptItem): void {
    this.currentScript = script
  }

  public addScript(title: string = '新脚本', code: string = demo1): ScriptItem {
    const newScript: ScriptItem = {
      id: Date.now(),
      name: title,
      code: code,
      isRunning: false
    }
    this.scripts.push(newScript)
    this.currentScript = newScript
    this.saveScripts()
    return newScript
  }

  public removeScript(id: number): void {
    const index = this.scripts.findIndex(script => script.id === id)
    if (index > -1) {
      this.scripts.splice(index, 1)
      if (this.currentScript.id === id) {
        if (this.scripts.length === 0) {
          this.addScript()
        }
        this.currentScript = this.scripts[0]
      }
      this.saveScripts()
    }
  }

  public async runScript(): Promise<void> {
    let script = this.currentScript
    if (script.isRunning) {
      return
    }

    script.isRunning = true

    try {
      const scriptContext = {
        stringToUint8Array: this.serialHelper.stringToUint8Array.bind(this.serialHelper),
        uint8ArrayToHexString: this.serialHelper.uint8ArrayToHexString.bind(this.serialHelper),
        uint8ArrayToString: this.serialHelper.uint8ArrayToString.bind(this.serialHelper),
        sendText: (text: string) => {
          const data = this.serialHelper.stringToUint8Array(text)
          eventCenter.emit(EventNames.SERIAL_SEND, data)
        },
        sendHex: (hex: string | Uint8Array) => {
          let data = hex;
          if (typeof hex === 'string') {
            data = this.serialHelper.stringToUint8Array(hex, true)
          }
          eventCenter.emit(EventNames.SERIAL_SEND, data)
        },
        updateDataTable: (data: any) => {
          eventCenter.emit(EventNames.DATA_UPDATE, data)
        },
        getDataTables: () => {
          const fieldStore = useFieldStore()
          return JSON.parse(JSON.stringify(fieldStore.fields))
        },
        sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
        setTimeout: (fn: Function, ms: number) => {
          const timeout = setTimeout(fn, ms)
          this.RuntimerTimerouts.push(timeout)
          return timeout
        },
        setInterval: (fn: Function, ms: number) => {
          const interval = setInterval(fn, ms)
          this.RuntimerTimerIntervals.push(interval)
          return interval
        }
      }

      const wrappedCode = `
return (async function() {
  ${script.code}


  let DataReceiverInterface = typeof DataReceiver == 'undefined' ? null : DataReceiver;
  let DataSenderInterface = typeof DataSender == 'undefined'? null : DataSender;
  return { DataReceiverInterface, DataSenderInterface };
})()
      `

      const fn = new Function('context', `with(context) { ${wrappedCode} }`)
      this.runtimer = await fn(scriptContext)
      
    } catch (error) {
      console.error('脚本执行错误:', error)

      eventCenter.emit(EventNames.SERIAL_ERROR, { error: error instanceof Error ? error.message : '未知错误' })
      this.stopScript()
    }

  }

  public stopScript(): void {
    this.currentScript.isRunning = false

    this.RuntimerTimerouts.forEach(clearTimeout)
    this.RuntimerTimerouts = []
    this.RuntimerTimerIntervals.forEach(clearInterval)
    this.RuntimerTimerIntervals = []
  }

  public async getRuntimer(): Promise<Runtimer> {
    if (!this.currentScript.isRunning) {
      await this.runScript()
    }
    return this.runtimer
  }

  public saveScripts(): void {
    const profile = this.profileManager.activeProfile
    if (profile) {
      this.profileManager.updateProfile(profile.id, {
        config: {
          ...profile.config,
          scripts: this.scripts
        }
      })
    }
  }

  private loadScripts(): void {
    const profile = this.profileManager.activeProfile
    const savedScripts = profile?.config?.scripts as ScriptItem[] | undefined
    
    if (savedScripts && savedScripts.length > 0) {
      this.scripts = savedScripts
    } else {
      this.addScript('数据处理Demo（key:val,key:val）', demo1)
    }
    
    this.scripts.map((script) => {
      script.isRunning = false
    })

    this.currentScript = this.scripts[0] || this.currentScript
  }

  public reloadFromProfile(): void {
    this.loadScripts()
  }
}
