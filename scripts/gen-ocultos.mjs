#!/usr/bin/env node
// scripts/gen-ocultos.mjs — Gera api/ocultos-data.mjs com os posts hidden
// Rodado no build: node scripts/validate-covers.mjs && node scripts/gen-ocultos.mjs && astro build
// Formato + coleta vivem em scripts/ocultos-core.mjs (fonte única compartilhada
// com api/liberar.mjs — o release atômico regenera o MESMO formato byte-idêntico).

import { regenerateDataFile } from './ocultos-core.mjs';

const hidden = regenerateDataFile();
console.log(`gen-ocultos: ${hidden} posts hidden → api/ocultos-data.mjs`);
