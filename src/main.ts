import './ui/style.css';
import { bootApp } from './ui/app';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Root element #app not found');
}
bootApp(root);
