#!/usr/bin/env node
// Thin CLI wrapper — logic lives in ./cli/compare-cli.mjs
import { runCompareCli } from './cli/compare-cli.mjs';

process.exitCode = runCompareCli(process.argv.slice(2));
