# DC-DC 開關電流互動教學（DC-DC Topology Series）

BOOST、BUCK、四開關升降壓三個中英雙語互動教學頁，說明開關電流與輸入、輸出電流的關係。

- `_site/`：Vercel 部署的靜態網站（`index.html` 系列首頁＋三個拓撲頁，共用 `assets/`）
- `_src/`：產生器。`template.html` 是版型與動畫引擎，`*.part.html` 是各拓撲內容，`index.site.html` 是首頁
- 更新流程：修改 `_src/` → `python _src/build.py` → commit 並 push，Vercel 會自動重新部署

內容依據：芯龍半導體 XLSEMI 應用筆記〈開關電流與輸入輸出電流關係〉-1 BOOST、-2 BUCK；TI SLVA535B、TI SSZTAE5、EDN、ADI（連結見各頁頁尾）。頁面中的波形與計算為理想化教學模型，實際設計請以晶片規格書為準。
