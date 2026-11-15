#!/usr/bin/env node
// Thin CLI wrapper — logic lives in ./cli/platform-cli.mjs
import { runPlatformCli } from './cli/platform-cli.mjs';

process.exitCode = runPlatformCli(process.argv.slice(2));
