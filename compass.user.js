// ==UserScript==
// @name         抖店数据面板修改器
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  修改抖店数据面板的显示内容
// @author       xifan
// @match        https://compass.jinritemai.com/shop/business-part*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jinritemai.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 创建修改面板的样式
  const style = document.createElement("style");
  style.textContent = `
        .data-modifier-panel {
            position: fixed;
            top: 60px;
            left: 0;
            background: white;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            z-index: 9999;
            width: 280px;
        }
        .field-group {
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .field-group:last-child {
            border-bottom: none;
        }
        .field-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }
        .field-inputs {
            display: flex;
            gap: 5px;
        }
        .field-inputs input {
            flex: 1;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .field-inputs select {
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .apply-btn {
            width: 100%;
            padding: 8px;
            background: #1966ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .apply-btn:hover {
            background: #0052ff;
        }
        .sub-value-input {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
    `;
  document.head.appendChild(style);

  // 定义需要修改的字段配置
  const fields = [
    {
      name: "成交金额",
      selector: '[data-btm="d85205_11233"]',
      hasSubValues: true,
    },
    {
      name: "退款金额",
      selector: '[data-btm="d85205_11234"]',
      hasSubValues: true,
    },
    {
      name: "成交订单数",
      selector: '[data-btm="d85205_11235"]',
      hasSubValues: true,
    },
    {
      name: "成交人数",
      selector: '[data-btm="d85205_11236"]',
      hasSubValues: true,
    },
    // 可以继续添加其他字段...
  ];

  // 创建修改面板
  function createModifierPanel() {
    const panel = document.createElement("div");
    panel.className = "data-modifier-panel";

    let html = "<h3>数据修改面板</h3>";

    fields.forEach((field) => {
      html += `
                <div class="field-group">
                    <div class="field-title">${field.name}</div>
                    <div class="field-inputs">
                        <input type="text" class="value-input" data-field="${
                          field.selector
                        }" placeholder="数值">
                        <select class="trend-select">
                            <option value="up">↑</option>
                            <option value="down">↓</option>
                        </select>
                        <input type="text" class="ratio-input" placeholder="变化率">
                    </div>
                    ${
                      field.hasSubValues
                        ? `
                        <div class="sub-value-input">
                            <input type="text" class="exceed-ratio" placeholder="超过同行比例">
                            <input type="text" class="excellent-value" placeholder="同行优秀值">
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
    });

    html += '<button class="apply-btn">应用所有修改</button>';
    panel.innerHTML = html;
    document.body.appendChild(panel);

    // 添加事件监听
    panel
      .querySelector(".apply-btn")
      .addEventListener("click", applyAllModifications);
  }

  // 应用所有修改
  function applyAllModifications() {
    fields.forEach((field) => {
      const container = document.querySelector(field.selector);
      if (!container) return;

      const inputs = document.querySelector(
        `[data-field="${field.selector}"]`
      ).parentElement;
      const value = inputs.querySelector(".value-input").value;
      const trend = inputs.querySelector(".trend-select").value;
      const ratio = inputs.querySelector(".ratio-input").value;

      // 修改主数值
      const valueElement = container.querySelector(
        ".value-KaSdAo span span:last-child"
      );
      if (valueElement && value) {
        valueElement.textContent = value;
      }

      // 修改趋势和变化率
      const ratioElement = container.querySelector(".cp-change-ratio-value");
      if (ratioElement && ratio) {
        ratioElement.className = `value-P9UU1b ${
          trend === "up" ? "up-uranyB" : "down-OAkhZz"
        } cp-change-ratio-value`;
        ratioElement.textContent = ratio;
      }

      // 修改趋势箭头
      const trendElement = container.querySelector(".cp-change-ratio-trend");
      if (trendElement) {
        trendElement.innerHTML =
          trend === "up" ? getUpArrowSVG() : getDownArrowSVG();
      }

      // 修改底部数据
      if (field.hasSubValues) {
        const fieldGroup = inputs.parentElement;
        const exceedRatio = fieldGroup.querySelector(".exceed-ratio").value;
        const excellentValue =
          fieldGroup.querySelector(".excellent-value").value;

        const bottomItems = container.querySelectorAll(".bottomItem-nelI6_");
        if (bottomItems[0] && exceedRatio) {
          bottomItems[0].textContent = `超过同行同级${exceedRatio}的商家`;
        }
        if (bottomItems[1] && excellentValue) {
          bottomItems[1].textContent = `同行同级优秀值${excellentValue}`;
        }
      }
    });
  }

  // 获取上升箭头SVG
  function getUpArrowSVG() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
            <path d="M0 1.39876e-06L16 0L16 16L1.39876e-06 16L0 1.39876e-06Z" fill="white" fill-opacity="0.01"></path>
            <path class="upIdentify-LQaHnC cp-change-ratio-trend-icon" d="M8 4.52931L8 11.5" stroke-width="1.16667" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M11.5 8L8 4.5L4.5 8" class="upIdentify-LQaHnC cp-change-ratio-trend-icon" stroke-width="1.16667" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
  }

  // 获取下降箭头SVG
  function getDownArrowSVG() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
            <path d="M0 16L16 16L16 0L1.39876e-06 -1.39876e-06L0 16Z" fill="white" fill-opacity="0.01"></path>
            <path class="downIdentify-GA6o3X cp-change-ratio-trend-icon" d="M8 11.4707L8 4.5" stroke-width="1.16667" stroke-linecap="round" stroke-linejoin="round"></path>
            <path class="downIdentify-GA6o3X cp-change-ratio-trend-icon" d="M11.5 8L8 11.5L4.5 8" stroke-width="1.16667" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
  }

  // 等待页面加载完成后初始化
  function init() {
    if (document.querySelector(".overviewContainer-HrpFrv")) {
      createModifierPanel();
    } else {
      setTimeout(init, 1000);
    }
  }

  init();
})();
