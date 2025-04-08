import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform
} from 'react-native';
import { logger } from '../utils/logger';

export function LogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    const logEntries = await logger.getLogs();
    setLogs(logEntries);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleClearLogs = async () => {
    await logger.clearLogs();
    setLogs([]);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      default:
        return '#34C759';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Error Logs</Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearLogs}>
          <Text style={styles.clearButtonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {logs.map((log, index) => (
          <View
            key={index}
            style={[
              styles.logEntry,
              { borderLeftColor: getLogColor(log.type) }
            ]}
          >
            <Text style={styles.timestamp}>
              {new Date(log.timestamp).toLocaleString()}
            </Text>
            <Text style={[styles.logType, { color: getLogColor(log.type) }]}>
              {log.type.toUpperCase()}
            </Text>
            <Text style={styles.message}>{log.message}</Text>
            {log.details && (
              <Text style={styles.details}>
                {JSON.stringify(log.details, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  logEntry: {
    padding: 12,
    borderLeftWidth: 4,
    marginVertical: 4,
    marginHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  logType: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
}); 