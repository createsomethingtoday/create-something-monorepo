-- CREATE SOMETHING Neovim Configuration
-- Philosophy: The editor recedes into writing
--
-- Zuhandenheit: When hammering, the hammer disappears.
-- When editing, the editor disappears.
--
-- Structure:
--   init.lua           - Entry point (this file)
--   lua/config/        - Core configuration
--   lua/plugins/       - Plugin configurations
--
-- Claude Code Integration:
--   - Minimal config for fast startup
--   - No heavy LSP (Claude Code handles intelligence)
--   - Focus: text editing, git, navigation

-- ─────────────────────────────────────────────────────────────
-- Leader Key (Space - universal, accessible)
-- ─────────────────────────────────────────────────────────────

vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- ─────────────────────────────────────────────────────────────
-- Core Options
-- ─────────────────────────────────────────────────────────────

local opt = vim.opt

-- Line numbers: relative for motion, absolute for reference
opt.number = true
opt.relativenumber = true

-- Indentation: 2 spaces (matches monorepo)
opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true
opt.smartindent = true

-- Search: incremental, smart case
opt.ignorecase = true
opt.smartcase = true
opt.incsearch = true
opt.hlsearch = true

-- UI: minimal chrome
opt.signcolumn = "yes"
opt.cursorline = true
opt.scrolloff = 8
opt.sidescrolloff = 8
opt.wrap = false
opt.termguicolors = true

-- Split behavior: natural
opt.splitbelow = true
opt.splitright = true

-- Clipboard: system integration
opt.clipboard = "unnamedplus"

-- Undo: persistent
opt.undofile = true
opt.undolevels = 10000

-- Performance
opt.updatetime = 250
opt.timeoutlen = 300

-- Invisible characters (shown when needed)
opt.list = true
opt.listchars = { tab = "» ", trail = "·", nbsp = "␣" }

-- ─────────────────────────────────────────────────────────────
-- Keymaps: Muscle memory, not discovery
-- ─────────────────────────────────────────────────────────────

local map = vim.keymap.set

-- Clear search highlight
map("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Better window navigation
map("n", "<C-h>", "<C-w>h", { desc = "Move to left window" })
map("n", "<C-j>", "<C-w>j", { desc = "Move to lower window" })
map("n", "<C-k>", "<C-w>k", { desc = "Move to upper window" })
map("n", "<C-l>", "<C-w>l", { desc = "Move to right window" })

-- Resize windows
map("n", "<C-Up>", "<cmd>resize +2<CR>")
map("n", "<C-Down>", "<cmd>resize -2<CR>")
map("n", "<C-Left>", "<cmd>vertical resize -2<CR>")
map("n", "<C-Right>", "<cmd>vertical resize +2<CR>")

-- Move lines (visual mode)
map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")

-- Keep cursor centered
map("n", "<C-d>", "<C-d>zz")
map("n", "<C-u>", "<C-u>zz")
map("n", "n", "nzzzv")
map("n", "N", "Nzzzv")

-- Better paste (don't lose register)
map("x", "<leader>p", [["_dP]])

-- Quick save
map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save" })

-- Quick quit
map("n", "<leader>q", "<cmd>q<CR>", { desc = "Quit" })

-- ─────────────────────────────────────────────────────────────
-- File Explorer (netrw - built in, no plugin needed)
-- ─────────────────────────────────────────────────────────────

vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3
vim.g.netrw_browse_split = 4
vim.g.netrw_winsize = 25

map("n", "<leader>e", "<cmd>Explore<CR>", { desc = "File explorer" })

-- ─────────────────────────────────────────────────────────────
-- Autocommands
-- ─────────────────────────────────────────────────────────────

local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- Highlight on yank
autocmd("TextYankPost", {
  group = augroup("highlight_yank", { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

-- Return to last edit position
autocmd("BufReadPost", {
  group = augroup("last_position", { clear = true }),
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    local lcount = vim.api.nvim_buf_line_count(0)
    if mark[1] > 0 and mark[1] <= lcount then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})

-- ─────────────────────────────────────────────────────────────
-- Color Scheme: Canon-aligned
-- ─────────────────────────────────────────────────────────────

-- Pure black background, minimal color
vim.cmd([[
  colorscheme default
  hi Normal guibg=#000000 guifg=#ffffff
  hi NormalFloat guibg=#0a0a0a
  hi SignColumn guibg=#000000
  hi LineNr guifg=#404040
  hi CursorLineNr guifg=#ffffff
  hi CursorLine guibg=#111111
  hi Visual guibg=#333333
  hi Comment guifg=#606060
  hi StatusLine guibg=#111111 guifg=#808080
  hi StatusLineNC guibg=#0a0a0a guifg=#404040
  hi VertSplit guifg=#1a1a1a guibg=NONE
  hi Search guibg=#4477aa guifg=#ffffff
  hi IncSearch guibg=#60a5fa guifg=#000000
]])

-- ─────────────────────────────────────────────────────────────
-- Status Line: Minimal
-- ─────────────────────────────────────────────────────────────

opt.statusline = " %f %m%=%l:%c "

-- ─────────────────────────────────────────────────────────────
-- Plugin Manager: lazy.nvim (bootstrap)
-- ─────────────────────────────────────────────────────────────

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git", "clone", "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- Minimal plugins (Claude Code handles the heavy lifting)
require("lazy").setup({
  -- Treesitter: syntax highlighting
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter.configs").setup({
        ensure_installed = { "lua", "typescript", "javascript", "svelte", "css", "html", "json", "markdown" },
        highlight = { enable = true },
        indent = { enable = true },
      })
    end,
  },

  -- Telescope: fuzzy finding
  {
    "nvim-telescope/telescope.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    keys = {
      { "<leader>ff", "<cmd>Telescope find_files<CR>", desc = "Find files" },
      { "<leader>fg", "<cmd>Telescope live_grep<CR>", desc = "Live grep" },
      { "<leader>fb", "<cmd>Telescope buffers<CR>", desc = "Buffers" },
      { "<leader>fh", "<cmd>Telescope help_tags<CR>", desc = "Help" },
    },
  },

  -- Git signs
  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require("gitsigns").setup({
        signs = {
          add = { text = "│" },
          change = { text = "│" },
          delete = { text = "_" },
          topdelete = { text = "‾" },
          changedelete = { text = "~" },
        },
      })
    end,
  },

  -- Comment: gcc to comment
  { "numToStr/Comment.nvim", config = true },

  -- Surround: ys, cs, ds
  { "kylechui/nvim-surround", config = true },

  -- Autopairs
  { "windwp/nvim-autopairs", config = true },
}, {
  -- Lazy options
  ui = { border = "rounded" },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip", "matchit", "matchparen", "netrwPlugin",
        "tarPlugin", "tohtml", "tutor", "zipPlugin",
      },
    },
  },
})

-- ─────────────────────────────────────────────────────────────
-- End. The editor recedes.
-- ─────────────────────────────────────────────────────────────
