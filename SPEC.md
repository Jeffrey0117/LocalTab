# LocalTab - 視窗配置持久化功能規格

## 1. 功能概述

新增視窗配置的持久化功能，讓使用者可以：
- 儲存目前的 localhost 網址列表
- 儲存目前的佈局設定
- 頁面重新載入後自動還原設定
- 手動更新和載入配置

## 2. 技術方案

### 2.1 儲存機制
- 使用瀏覽器 `localStorage` 進行本地持久化
- 資料格式：JSON

### 2.2 儲存的資料結構

```javascript
{
  "version": 1,
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3001/",
    "http://localhost:64624/story"
  ],
  "layout": "left",
  "lastUpdated": "2024-01-12T10:30:00.000Z"
}
```

### 2.3 localStorage Key
- Key: `localtab_config`

## 3. 功能需求

### 3.1 自動儲存 (Auto Save)
- 當使用者新增 URL 時，自動儲存
- 當使用者移除 URL 時，自動儲存
- 當使用者編輯 URL 時，自動儲存
- 當使用者切換佈局時，自動儲存

### 3.2 自動載入 (Auto Load)
- 頁面載入時，自動從 localStorage 讀取配置
- 如果沒有儲存的配置，使用預設值
- 預設值不再寫死，改為空陣列或單一示範 URL

### 3.3 手動操作
- 提供「匯出配置」按鈕 - 將配置下載為 JSON 檔案
- 提供「匯入配置」按鈕 - 從 JSON 檔案載入配置
- 提供「重置配置」按鈕 - 清除 localStorage，恢復預設

## 4. UI 設計

### 4.1 新增設定按鈕區域
在現有的控制列中新增：
```
[匯出] [匯入] [重置]
```

### 4.2 按鈕樣式
- 與現有按鈕風格一致
- 使用相同的配色方案

### 4.3 操作回饋
- 儲存成功時顯示短暫提示
- 匯入成功/失敗時顯示提示

## 5. API 設計

### 5.1 核心函數

```javascript
// 儲存配置到 localStorage
function saveConfig()

// 從 localStorage 載入配置
function loadConfig()

// 匯出配置為 JSON 檔案
function exportConfig()

// 從 JSON 檔案匯入配置
function importConfig(file)

// 重置為預設配置
function resetConfig()

// 取得預設配置
function getDefaultConfig()
```

### 5.2 事件觸發點

| 事件 | 觸發動作 |
|------|----------|
| 頁面載入 | loadConfig() |
| 新增 URL | saveConfig() |
| 移除 URL | saveConfig() |
| 編輯 URL | saveConfig() |
| 切換佈局 | saveConfig() |
| 點擊匯出 | exportConfig() |
| 點擊匯入 | importConfig() |
| 點擊重置 | resetConfig() |

## 6. 預設配置

移除寫死的 localhost 網址，改為：

```javascript
const DEFAULT_CONFIG = {
  version: 1,
  urls: ['http://localhost:3000/'],
  layout: 'left',
  lastUpdated: null
};
```

## 7. 錯誤處理

- localStorage 不可用時：顯示警告，功能降級為記憶體模式
- JSON 解析失敗時：使用預設配置
- 匯入檔案格式錯誤時：顯示錯誤提示，不更新配置

## 8. 實作順序

1. 建立 localStorage 存取函數
2. 修改頁面載入邏輯
3. 在現有操作中加入自動儲存
4. 新增匯出/匯入/重置 UI
5. 測試所有功能

## 9. 相容性

- 支援所有現代瀏覽器
- localStorage 容量限制：約 5MB（足夠儲存配置）
