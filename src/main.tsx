import React from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import App from './App';
import './style.css';
import './polish.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App invoke={invoke} open={open} save={save} /></React.StrictMode>);
