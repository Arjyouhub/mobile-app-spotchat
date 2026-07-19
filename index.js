import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It ensures universal execution across Expo Go, Native, and Web.
registerRootComponent(App);
