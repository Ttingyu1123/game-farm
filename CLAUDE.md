# 療癒小農場 Cozy Pocket Farm

純 HTML5 + ES Modules 的農場經營遊戲，零框架、零建置。功能、機制與版本沿革見 [README.md](README.md)，這裡只放動手前要知道的事。

## 指令

```bash
# 本機執行（ES Modules 不能用 file:// 開）
python -m http.server 5317 --bind 127.0.0.1

# 回歸測試（需先啟動上面的伺服器；Playwright 裝在全域 npm）
NODE_PATH="$(npm root -g)" node tests/test-farm.js
```

測試輸出裡的「存檔損壞」console error 是測試刻意餵壞檔，屬預期。測試會重寫 `tests/shot-*.png`，沒有要更新截圖就 `git checkout -- tests/shot-desktop.png tests/shot-mobile.png`。

## 部署

- push `main` 即由 GitHub Pages 自動部署到 <https://game-farm.tingyudeco.com/>（網域沒有 s）。
- 根目錄 `CNAME` 控制自訂網域，不要刪。
- 上線後打正式網址確認新檔案已生效。

## 改動時的規則

- **數值與內容走資料表**：`src/config.js` 與 `src/data/*.js`。新增作物、道具、任務、配方只改資料。
- **圖示**：資料表保留 emoji 當文字備援，畫面由 `src/ui/icons.js` 的 `EMOJI_ICON` 換成 `assets/icons/*.png`。新增圖示要挑一個沒被用過的 emoji。新作物需要 `crop-<id>-1/2/3.png` 與 `crop-<id>.png`。
- **定時更新的文字**：含對照表內 emoji 的元素不要每個 tick 無條件重設 `textContent`，照 `HUD.js` 的 `setText()` 先比對再寫，否則圖示會反覆重建。
- **背景音樂**：音檔在 R2（`tingyu-music` bucket 的 `game-farm/bgm/<季節>.m4a`），位置寫在 `config.js` 的 `BGM`，不進 repo。換曲覆蓋同名檔即可。`AudioSystem` 的程式生成音樂是載入失敗時的備援，不要移除。
- **音訊啟動**：播放必須由使用者點擊觸發。被瀏覽器擋下時 `AudioSystem` 會等下一次點擊重試。
- **手機**：改版面後用 390×844 視窗截圖確認；Chromium 模擬不等於 iPhone 真機，沒在真機驗過要明說。

圖示與音樂的完整產線、已知限制與踩坑記錄在 README 的「素材產線」「已知限制」「踩坑記錄」三節。
