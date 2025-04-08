import * as FileSystem from 'expo-file-system';

interface LogEntry {
  timestamp: string;
  type: 'error' | 'info' | 'warning';
  message: string;
  details?: any;
}

class Logger {
  private logFileName: string;
  private logQueue: LogEntry[] = [];
  private isWriting: boolean = false;

  constructor() {
    this.logFileName = `${FileSystem.documentDirectory}app-logs.json`;
    this.initializeLogFile();
  }

  private async initializeLogFile() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFileName);
      if (!fileInfo.exists) {
        await FileSystem.writeAsStringAsync(this.logFileName, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  private async writeLogsToFile() {
    if (this.isWriting || this.logQueue.length === 0) return;

    this.isWriting = true;
    try {
      const fileContent = await FileSystem.readAsStringAsync(this.logFileName);
      const existingLogs = JSON.parse(fileContent);
      const updatedLogs = [...existingLogs, ...this.logQueue];
      
      // Keep only the last 1000 logs to prevent the file from growing too large
      const trimmedLogs = updatedLogs.slice(-1000);
      
      await FileSystem.writeAsStringAsync(
        this.logFileName,
        JSON.stringify(trimmedLogs, null, 2)
      );
      
      this.logQueue = [];
    } catch (error) {
      console.error('Failed to write logs:', error);
    } finally {
      this.isWriting = false;
    }
  }

  async error(message: string, details?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      message,
      details
    };
    
    this.logQueue.push(logEntry);
    await this.writeLogsToFile();
    console.error(message, details);
  }

  async info(message: string, details?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'info',
      message,
      details
    };
    
    this.logQueue.push(logEntry);
    await this.writeLogsToFile();
    console.log(message, details);
  }

  async warning(message: string, details?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'warning',
      message,
      details
    };
    
    this.logQueue.push(logEntry);
    await this.writeLogsToFile();
    console.warn(message, details);
  }

  async getLogs(): Promise<LogEntry[]> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(this.logFileName);
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  async clearLogs() {
    try {
      await FileSystem.writeAsStringAsync(this.logFileName, JSON.stringify([]));
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

export const logger = new Logger(); 