import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';
export const gigiMidnightTheme=defineTheme({
 name:'gigi-midnight',extends:neutralTheme,
 tokens:{
  '--color-background-body':['#101216','#101216'],
  '--color-background-surface':['#1b1e24','#1b1e24'],
  '--color-background-muted':['#101216','#101216'],
  '--color-background-card':['#1b1e24','#1b1e24'],
  '--color-background-popover':['#1b1e24','#1b1e24'],
  '--color-text-primary':['#f4f5f7','#f4f5f7'],
  '--color-text-secondary':['#b0b8c5','#b0b8c5'],
  '--color-accent':['#d4e2f6','#d4e2f6'],
  '--color-on-accent':['#13171e','#13171e']
 }
});
