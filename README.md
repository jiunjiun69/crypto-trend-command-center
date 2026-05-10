# Crypto Trend Command Center

純前端加密貨幣趨勢 dashboard，整理 Checkonchain 公開 chart 頁面為可搜尋、分類、收藏與多圖比較的分析工作台。

## 使用方式

直接開啟 `index.html` 即可使用。所有圖表由 `https://charts.checkonchain.com/` 的公開靜態 chart 頁透過 iframe 載入。

## 部署到 GitHub Pages

1. 將本資料夾推到 GitHub repository。
2. 到 repository 的 `Settings` -> `Pages`。
3. `Build and deployment` 選 `Deploy from a branch`。
4. Branch 選 `main`，資料夾選 `/root`。
5. 儲存後等待 GitHub Pages 發布。

## 更新指標清單

目前 `data/charts.js` 由 Checkonchain 首頁索引整理而來，共包含 530 個 chart。未來若對方新增圖表，可執行：

```bash
node scripts/update-charts.js
```

專案也包含 GitHub Actions：

- `Update Checkonchain Chart Index`：每天台北時間 02:00 自動更新 `data/charts.js`，有變動才 commit。
- `Deploy GitHub Pages`：每次推到 `main` 後自動部署 GitHub Pages。
