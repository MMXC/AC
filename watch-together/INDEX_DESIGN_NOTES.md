# index.html 视觉设计与字体说明

- **字体组合**
  - 标题与品牌：Space Grotesk（Google Fonts，作为显示字体）
  - 正文字体：Inter（Google Fonts，作为正文字体）
  - 通过 `--font-display` 与 `--font-body` CSS 变量在 `index.html` 中统一管理。

- **颜色与主题**
  - 背景采用深蓝夜空 + 青绿高光的组合，而非常见的紫色渐变：
    - 背景主色：`#020617`（深夜蓝）
    - 强调色：`#22c55e`（荧光绿）、`#38bdf8`（湖蓝）
  - 使用 CSS 变量集中管理主题色（如 `--color-bg`、`--color-primary`、`--color-text-main` 等），方便后续统一调整。

- **视觉细节**
  - 背景使用多层 `radial-gradient` 叠加，并配合 `body::before` 的柔和纹理，营造轻微噪点与光晕效果。
  - `.container` 使用玻璃感卡片设计：
    - 渐变叠加的深色面板
    - 细边框与顶部高光线（`::after`）
    - 柔和阴影（`--shadow-soft`）
  - 表单控件使用柔和的焦点光晕与轻微浮起效果，按钮采用渐变高亮与强阴影，以强化“主行动”视觉权重。

