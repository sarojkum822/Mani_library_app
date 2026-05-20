import Constants, { ExecutionEnvironment } from 'expo-constants';

export function isExpoGoClient(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}
