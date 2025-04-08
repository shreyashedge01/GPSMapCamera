export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Logs: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 