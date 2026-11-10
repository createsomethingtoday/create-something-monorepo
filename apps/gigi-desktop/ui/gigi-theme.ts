import {defineTheme} from '@astryxdesign/core/theme';
import {gigiDevTheme} from './gigi-dev-theme';
export const gigiMidnightTheme=defineTheme({
 name:'gigi-midnight',extends:gigiDevTheme,
 tokens:{
  '--color-background-body':['#0d0f12','#0d0f12'],
  '--color-background-surface':['#16191e','#16191e'],
  '--color-background-muted':['#23272e','#23272e'],
  '--color-background-card':['#16191e','#16191e'],
  '--color-background-popover':['#16191e','#16191e'],
  '--color-text-primary':['#f4f5f7','#f4f5f7'],
  '--color-text-secondary':['#b0b8c5','#b0b8c5'],
  '--color-icon-primary':['#f4f5f7','#f4f5f7'],
  '--color-icon-secondary':['#b0b8c5','#b0b8c5'],
  '--color-border':['#353b45','#353b45'],
  '--color-border-emphasized':['#657080','#657080'],
  '--color-text-accent':['#afca76','#afca76'],
  '--color-icon-accent':['#afca76','#afca76'],
  '--color-accent-muted':['#2c3521','#2c3521']
 }
});
