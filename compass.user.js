// ==UserScript==
// @name         抖店数据面板修改器
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  修改抖店数据面板的显示内容
// @author       xifan
// @match        https://compass.jinritemai.com/shop/business-part*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jinritemai.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // 更新样式
  const style = document.createElement("style");
  style.textContent = `
        .data-modifier-panel {
            position: fixed;
            top: 60px;
            left: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            z-index: 9999;
            width: 280px;
            display: none;
            max-height: 90vh;
            overflow-y: auto;
        }
        .toggle-button {
            position: fixed;
            top: 20px;
            left: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background: #1966ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .field-group {
            margin-bottom: 10px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .field-header {
            padding: 8px 12px;
            background: #f5f5f5;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 4px 4px 0 0;
        }
        .field-header:after {
            content: '▼';
            font-size: 12px;
            transition: transform 0.3s;
        }
        .field-header.collapsed:after {
            transform: rotate(-90deg);
        }
        .field-content {
            padding: 10px;
            display: none;
        }
        .field-content.expanded {
            display: block;
        }
        .field-title {
            font-weight: bold;
            color: #333;
            font-size: 13px;
        }
        .field-row {
            margin-bottom: 8px;
            display: flex;
            gap: 5px;
        }
        .field-row:last-child {
            margin-bottom: 0;
        }
        .field-row input {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
        }
        .field-row select {
            width: 40px;
            padding: 4px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
        }
        .apply-btn {
            width: 100%;
            padding: 8px;
            background: #1966ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        .profile-section {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        .format-config-section {
            margin: 15px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
        }
        .format-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
        }
        .format-options label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
        }
        .format-options input[type="checkbox"] {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border: 1px solid #999;
            border-radius: 2px;
            margin: 0;
            cursor: pointer;
            position: relative;
            background: white;
        }
        .format-options input[type="checkbox"]:checked {
            background: #1966ff;
            border-color: #1966ff;
        }
        .format-options input[type="checkbox"]:checked::after {
            content: '';
            position: absolute;
            left: 4px;
            top: 1px;
            width: 4px;
            height: 8px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .format-options input[type="checkbox"]:hover {
            border-color: #1966ff;
        }
    `;
  document.head.appendChild(style);

  const SELECTORS = {
    CONTAINER: '[class*="overviewContainer-"]',
    CARD: '[class*="cardWrapper-"]',
    TITLE: '[class*="title-"][class*="PibzGF"]',
    VALUE: '[class*="value-"][class*="KaSdAo"] span span:last-child',
    RATIO: '[class*="cp-change-ratio-value"]',
    TREND: '[class*="cp-change-ratio-trend"]',
    BOTTOM_ITEMS: '[class*="bottomItem-"]',
    AVATAR: {
      TOP: '[class*="userDropDown-"] [class*="img-default-wrapper"] img',
      DROPDOWN: '[class*="dropDownInfo-"] [class*="img-default-wrapper"] img',
    },
    USERNAME: {
      TOP: '[class*="userName-"]',
      DROPDOWN: '[class*="dropDownName-"]',
    },
  };

  let panel = null;
  let modifyButton = null;

  // 添加默认配置
  const DEFAULT_FORMAT_CONFIG = {
    money: {
      useThousands: true,
      useDecimals: true,
      useCurrency: true
    }
  };

  // 格式化配置对象
  let FORMAT_CONFIG = {
    money: { ...DEFAULT_FORMAT_CONFIG.money }
  };

  // 加载保存的配置
  function loadFormatConfig() {
    try {
      const savedConfig = GM_getValue('formatConfig');
      if(savedConfig) {
        FORMAT_CONFIG.money = {
          ...DEFAULT_FORMAT_CONFIG.money,
          ...JSON.parse(savedConfig)
        };
      }
    } catch (error) {
      console.error('加载格式化配置失败:', error);
      FORMAT_CONFIG.money = { ...DEFAULT_FORMAT_CONFIG.money };
    }
  }

  // 保存配置
  function saveFormatConfig() {
    try {
      GM_setValue('formatConfig', JSON.stringify(FORMAT_CONFIG.money));
    } catch (error) {
      console.error('保存格式化配置失败:', error);
    }
  }

  // 修改格式化工具函数
  const formatters = {
    formatMoney(value) {
      if(!value) return value;
      
      // 移已有的¥符号、逗号和HTML标签
      let num = value.toString()
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/[¥,]/g, ''); // 移除¥符号和逗号
      
      // 检查是否为有效数字
      if(isNaN(num)) return value;
      
      // 保留两位小数
      if(FORMAT_CONFIG.money.useDecimals) {
        num = parseFloat(num).toFixed(2);
      }
      
      if(FORMAT_CONFIG.money.useThousands) {
        // 处理小数部分
        const parts = num.toString().split('.');
        // 添加千分位
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        num = parts.join('.');
      }
      
      // 添加货币符号
      return FORMAT_CONFIG.money.useCurrency ? `¥${num}` : num;
    },
    // 格式化百分比
    formatPercent(value) {
      if (!value) return value;
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return value.toString().endsWith("%") ? value : `${num.toFixed(2)}%`;
    },

    // 格式化超过同行比例
    formatExceedRatio(value) {
      if (!value) return value;
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return `${num.toFixed(2)}%`;
    },
  };

  // 判断是否是金额字段
  function isMoneyField(title) {
    return title.includes("金额") || title.includes("价");
  }

  // 添加字段配置
  const FIELD_CONFIGS = {
    // 标准字段显示所有输入项
    default: ["value", "trend", "ratio", "exceed", "excellent"],
    // 退款金额只显示基础输入项
    refund: ["value", "trend", "ratio"],
  };

  // 判断是否是退款相关字段
  function isRefundField(title) {
    return title.includes("退款");
  }

  // 创建修改面板
  function createModifierPanel() {
    if (panel) {
      panel.remove();
    }

    panel = document.createElement("div");
    panel.className = "data-modifier-panel";

    let html = `
            <div class="profile-section">
                <div class="field-title">个人信息修改</div>
                <div class="field-row">
                    <input type="text" id="avatar-input" class="avatar-input-field" placeholder="头像URL">
                </div>
                <div class="field-row">
                    <input type="text" id="username-input" class="username-input-field" placeholder="用户名">
                </div>
            </div>
            <div class="field-title" style="margin-bottom: 10px;">数据修改</div>
            <div class="format-config-section">
                <div class="field-title">金额格式化选项</div>
                <div class="format-options">
                    <label>
                        <input type="checkbox" id="useThousands" 
                               ${
                                 FORMAT_CONFIG.money.useThousands
                                   ? "checked"
                                   : ""
                               }>
                        添加千分位
                    </label>
                    <label>
                        <input type="checkbox" id="useDecimals" 
                               ${
                                 FORMAT_CONFIG.money.useDecimals
                                   ? "checked"
                                   : ""
                               }>
                        保留两位小数
                    </label>
                    <label>
                        <input type="checkbox" id="useCurrency" 
                               ${
                                 FORMAT_CONFIG.money.useCurrency
                                   ? "checked"
                                   : ""
                               }>
                        添加¥符号
                    </label>
                </div>
            </div>
        `;

    // 获取所有数据卡片
    const cards = document.querySelectorAll(SELECTORS.CARD);
    cards.forEach((card) => {
      const title =
        card.querySelector(SELECTORS.TITLE)?.textContent.trim() || "未知字段";
      const isMoneyType = isMoneyField(title);
      const isRefund = isRefundField(title);
      const fieldConfig = isRefund
        ? FIELD_CONFIGS.refund
        : FIELD_CONFIGS.default;

      html += `
                <div class="field-group" data-card-id="${card.getAttribute(
                  "data-btm"
                )}">
                    <div class="field-header collapsed">
                        ${title}
                    </div>
                    <div class="field-content">
                        ${
                          fieldConfig.includes("value")
                            ? `
                            <div class="field-row">
                                <input type="text" class="value-input" placeholder="${
                                  isMoneyType ? "数值(自动加¥)" : "数值"
                                }">
                                <select class="trend-select">
                                    <option value="up">↑</option>
                                    <option value="down">↓</option>
                                </select>
                            </div>
                        `
                            : ""
                        }
                        ${
                          fieldConfig.includes("ratio")
                            ? `
                            <div class="field-row">
                                <input type="text" class="ratio-input" placeholder="变化率(自动加%)">
                            </div>
                        `
                            : ""
                        }
                        ${
                          fieldConfig.includes("exceed")
                            ? `
                            <div class="field-row">
                                <input type="text" class="exceed-ratio" placeholder="超过同行比例(自动加%)">
                            </div>
                        `
                            : ""
                        }
                        ${
                          fieldConfig.includes("excellent")
                            ? `
                            <div class="field-row">
                                <input type="text" class="excellent-value" placeholder="${
                                  isMoneyType ? "优秀值(自动加¥)" : "优秀值"
                                }">
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            `;
    });

    html += `
            <button class="apply-btn">应用修改</button>
            <button class="apply-btn" style="background: #666" onclick="
                this.parentElement.style.display='none';
            ">隐藏 [y]</button>
        `;

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // 添加折叠功能
    panel.querySelectorAll(".field-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        header.nextElementSibling.classList.toggle("expanded");
      });
    });

    panel
      .querySelector(".apply-btn")
      .addEventListener("click", applyAllModifications);

    // 添加格式化选项事件监听
    ['useThousands', 'useDecimals', 'useCurrency'].forEach(id => {
        const checkbox = panel.querySelector(`#${id}`);
        if(checkbox) {
            // 确保初始状态正确
            checkbox.checked = FORMAT_CONFIG.money[id];
            checkbox.addEventListener('change', (e) => {
                FORMAT_CONFIG.money[id] = e.target.checked;
                saveFormatConfig();
            });
        }
    });
  }

  // 创建切换按钮
  function createToggleButton() {
    if (modifyButton) {
      modifyButton.remove();
    }

    modifyButton = document.createElement("button");
    modifyButton.className = "toggle-button";
    modifyButton.textContent = "修改 [x]";
    modifyButton.onclick = () => {
      if (panel) {
        panel.style.display = "block";
        modifyButton.style.top = "20px";
      }
    };
    document.body.appendChild(modifyButton);
  }

  // 添加全局按键事件处理
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // 如果当前焦点在输入框中，不处理快捷键
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // 转换为小写以忽略大小写
      const key = e.key.toLowerCase();

      if (key === "x" && e.key === "x") {
        // 确保是小写x
        if (panel) {
          panel.style.display = "block";
          modifyButton.style.top = "20px";
        }
      } else if (key === "y" && e.key === "y") {
        // 确保是小写y
        if (panel) {
          panel.style.display = "none";
          modifyButton.style.display = "none";
        }
      }
    });
  }

  // 修改监听DOM变化函数
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          const container = document.querySelector(SELECTORS.CONTAINER);
          const cards = document.querySelectorAll(SELECTORS.CARD);
          const topAvatar = document.querySelector(SELECTORS.AVATAR.TOP);
          const topUsername = document.querySelector(SELECTORS.USERNAME.TOP);

          // 检查所有必需元素是否都已加载
          if (container && cards.length > 0 && topAvatar && topUsername) {
            // 确保元素都加载完成后再初始化
            observer.disconnect();
            createToggleButton();
            createModifierPanel();
            setupKeyboardShortcuts();

            // 设置新的观察者来监听下拉菜单的变化

            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 修改应用修改函数中的数据处理部分
  function applyAllModifications() {
    // 修改获取输入值的方式
    const avatarInput = panel.querySelector("#avatar-input");
    const usernameInput = panel.querySelector("#username-input");

    const avatarUrl = avatarInput ? avatarInput.value || "" : "";
    const username = usernameInput ? usernameInput.value || "" : "";

    // 添加值检查
    if (avatarUrl && avatarUrl.trim()) {
      try {
        // 修改顶部头像
        const topAvatar = document.querySelector(SELECTORS.AVATAR.TOP);
        if (topAvatar) {
          topAvatar.src = avatarUrl;
          updateAvatarWrapper(topAvatar);
        }

        // 修改下拉菜单头像
        const dropdownAvatar = document.querySelector(
          SELECTORS.AVATAR.DROPDOWN
        );
        if (dropdownAvatar) {
          dropdownAvatar.src = avatarUrl;
          updateAvatarWrapper(dropdownAvatar);
        }
      } catch (error) {
        console.error("更新头像时出错:", error);
      }
    }

    if (username && username.trim()) {
      try {
        // 修改顶部用户名
        const topUsername = document.querySelector(SELECTORS.USERNAME.TOP);
        if (topUsername) topUsername.textContent = username;

        // 修改下拉菜单用户名
        const dropdownUsername = document.querySelector(
          SELECTORS.USERNAME.DROPDOWN
        );
        if (dropdownUsername) dropdownUsername.textContent = username;
      } catch (error) {
        console.error("更新用户名时出错:", error);
      }
    }

    // 修改数据卡片部分也添加错误处理
    document.querySelectorAll('.field-group[data-card-id]').forEach(group => {
        try {
            const cardId = group.getAttribute('data-card-id');
            const card = document.querySelector(`[data-btm="${cardId}"]`);
            if (!card) return;

            const title = group.querySelector('.field-header')?.textContent.trim();
            const isRefund = isRefundField(title);
            const isMoneyType = isMoneyField(title);

            const valueInput = group.querySelector('.value-input');
            const trendSelect = group.querySelector('.trend-select');
            const ratioInput = group.querySelector('.ratio-input');
            const exceedInput = group.querySelector('.exceed-ratio');
            const excellentInput = group.querySelector('.excellent-value');

            const value = valueInput ? valueInput.value || "" : "";
            const trend = trendSelect ? trendSelect.value || 'up' : 'up';
            const ratio = ratioInput ? ratioInput.value || "" : "";
            const exceedRatio = exceedInput ? exceedInput.value || "" : "";
            const excellentValue = excellentInput ? excellentInput.value || "" : "";

            // 修改主数值 - 只对金额类使用格式化选项
            if (value) {
                const valueElement = card.querySelector(SELECTORS.VALUE);
                if (valueElement) {
                    // 清除所有子元素
                    while (valueElement.firstChild) {
                        valueElement.removeChild(valueElement.firstChild);
                    }

                    if (isMoneyType) {
                        // 金额类使用格式化选项
                        const formattedValue = formatters.formatMoney(value);
                        valueElement.textContent = formattedValue;
                    } else {
                        // 非金额类直接使用值
                        valueElement.textContent = value;
                    }
                }
            }

            // 修改趋势和变化率 - 自动添加百分号
            if (ratio) {
                const ratioElement = card.querySelector(SELECTORS.RATIO);
                if (ratioElement) {
                    ratioElement.className = `value-P9UU1b ${
                        trend === 'up' ? 'up-uranyB' : 'down-OAkhZz'
                    } cp-change-ratio-value`;
                    // 自动添加百分号
                    ratioElement.textContent = formatters.formatPercent(ratio);
                }

                const trendElement = card.querySelector(SELECTORS.TREND);
                if (trendElement) {
                    trendElement.innerHTML =
                        trend === 'up' ? getUpArrowSVG() : getDownArrowSVG();
                }
            }

            // 只有非退款字段才修改底部数据 - 自动添加符号
            if (!isRefund) {
                const bottomItems = card.querySelectorAll(SELECTORS.BOTTOM_ITEMS);
                if (bottomItems[0] && exceedRatio) {
                    // 自动添加百分号
                    bottomItems[0].textContent = `超过同行同级${formatters.formatExceedRatio(
                        exceedRatio
                    )}的商家`;
                }
                if (bottomItems[1] && excellentValue) {
                    let formattedValue;
                    if (isMoneyType) {
                        // 金额类自动添加¥和千分位
                        formattedValue = `¥${parseFloat(
                            excellentValue
                        ).toLocaleString()}`;
                    } else {
                        // 非金额类保持原样或添加百分号
                        formattedValue = excellentValue.toString().endsWith("%")
                            ? excellentValue
                            : excellentValue;
                    }
                    bottomItems[1].textContent = `同行同级优秀值${formattedValue}`;
                }
            }
        } catch (error) {
            console.error('更新数据卡片时出错:', error);
        }
    });
  }

  // 添加头像包装器更新函数
  function updateAvatarWrapper(avatarElement) {
    const wrapper = avatarElement.closest('[class*="img-default-wrapper"]');
    if (wrapper) {
      wrapper.style.backgroundImage = "none";
      const className = wrapper.className.split(" ")[0];
      const styleId = `style-${className}`;
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
                    .${className}::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: none;
                    }
                `;
        document.head.appendChild(style);
      }
    }
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

  // 初始化
  function init() {
    loadFormatConfig();
    observeDOM();
  }

  init();
})();
