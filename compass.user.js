// ==UserScript==
// @name         抖店数据面板修改器
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  修改抖店数据面板的显示内容
// @author       xifan
// @match        https://compass.jinritemai.com/shop/business-part*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jinritemai.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 更新样式
    const style = document.createElement('style');
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
            display: none;
            max-height: 90vh;
            overflow-y: auto;
        }
        .toggle-button {
            position: fixed;
            top: 100px;
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
        AVATAR: '[class*="img-default-wrapper"] img',
        USERNAME: '[class*="userName-"]'
    };

    let panel = null;
    let modifyButton = null;

    // 添加格式化工具函数
    const formatters = {
        // 格式化金额
        formatMoney(value) {
            if(!value) return value;
            return value.toString().startsWith('¥') ? value : `¥${value}`;
        },
        
        // 格式化百分比
        formatPercent(value) {
            if(!value) return value;
            const num = parseFloat(value);
            if(isNaN(num)) return value;
            return value.toString().endsWith('%') ? value : `${num.toFixed(2)}%`;
        },
        
        // 格式化超过同行比例
        formatExceedRatio(value) {
            if(!value) return value;
            const num = parseFloat(value);
            if(isNaN(num)) return value;
            return `${num.toFixed(2)}%`;
        }
    };

    // 判断是否是金额字段
    function isMoneyField(title) {
        return title.includes('金额') || title.includes('价');
    }

    // 添加字段配置
    const FIELD_CONFIGS = {
        // 标准字段显示所有输入项
        default: ['value', 'trend', 'ratio', 'exceed', 'excellent'],
        // 退款金额只显示基础输入项
        refund: ['value', 'trend', 'ratio']
    };

    // 判断是否是退款相关字段
    function isRefundField(title) {
        return title.includes('退款');
    }

    // 创建修改面板
    function createModifierPanel() {
        if(panel) {
            panel.remove();
        }

        panel = document.createElement('div');
        panel.className = 'data-modifier-panel';

        let html = `
            <div class="profile-section">
                <div class="field-title">个人信息修改</div>
                <div class="field-row">
                    <input type="text" id="avatar-input" placeholder="头像URL">
                </div>
                <div class="field-row">
                    <input type="text" id="username-input" placeholder="用户名">
                </div>
            </div>
            <div class="field-title" style="margin-bottom: 10px;">数据修改</div>
        `;

        // 获取所有数据卡片
        const cards = document.querySelectorAll(SELECTORS.CARD);
        cards.forEach(card => {
            const title = card.querySelector(SELECTORS.TITLE)?.textContent.trim() || '未知字段';
            const isMoneyType = isMoneyField(title);
            const isRefund = isRefundField(title);
            const fieldConfig = isRefund ? FIELD_CONFIGS.refund : FIELD_CONFIGS.default;
            
            html += `
                <div class="field-group" data-card-id="${card.getAttribute('data-btm')}">
                    <div class="field-header collapsed">
                        ${title}
                    </div>
                    <div class="field-content">
                        ${fieldConfig.includes('value') ? `
                            <div class="field-row">
                                <input type="text" class="value-input" placeholder="${isMoneyType ? '数值(自动加¥)' : '数值'}">
                                <select class="trend-select">
                                    <option value="up">↑</option>
                                    <option value="down">↓</option>
                                </select>
                            </div>
                        ` : ''}
                        ${fieldConfig.includes('ratio') ? `
                            <div class="field-row">
                                <input type="text" class="ratio-input" placeholder="变化率(自动加%)">
                            </div>
                        ` : ''}
                        ${fieldConfig.includes('exceed') ? `
                            <div class="field-row">
                                <input type="text" class="exceed-ratio" placeholder="超过同行比例(自动加%)">
                            </div>
                        ` : ''}
                        ${fieldConfig.includes('excellent') ? `
                            <div class="field-row">
                                <input type="text" class="excellent-value" placeholder="${isMoneyType ? '优秀值(自动加¥)' : '优秀值'}">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="apply-btn">应用修改</button>
            <button class="apply-btn" style="background: #666" onclick="this.parentElement.style.display='none';document.querySelector('.toggle-button').style.display='none';">隐藏 [完全隐藏 y]</button>
        `;

        panel.innerHTML = html;
        document.body.appendChild(panel);

        // 添加折叠功能
        panel.querySelectorAll('.field-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                header.nextElementSibling.classList.toggle('expanded');
            });
        });

        panel.querySelector('.apply-btn').addEventListener('click', applyAllModifications);
    }

    // 创建切换按钮
    function createToggleButton() {
        if(modifyButton) {
            modifyButton.remove();
        }

        modifyButton = document.createElement('button');
        modifyButton.className = 'toggle-button';
        modifyButton.textContent = '修改 [x]';
        modifyButton.onclick = () => {
            if(panel) {
                panel.style.display = 'block';
                modifyButton.style.display = 'none';
            }
        };
        document.body.appendChild(modifyButton);
    }

    // 添加全局按键事件处理
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 如果当前焦点在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 转换为小写以忽略大小写
            const key = e.key.toLowerCase();

            if (key === 'x' && e.key === 'x') { // 确保是小写x
                if(panel) {
                    panel.style.display = 'block';
                    modifyButton.style.display = 'none';
                }
            } else if (key === 'y' && e.key === 'y') { // 确保是小写y
                if(panel) {
                    panel.style.display = 'none';
                    modifyButton.style.display = 'none';
                }
            }
        });
    }

    // 监听DOM变化
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            for(const mutation of mutations) {
                if(mutation.addedNodes.length) {
                    const container = document.querySelector(SELECTORS.CONTAINER);
                    const cards = document.querySelectorAll(SELECTORS.CARD);
                    
                    if(container && cards.length > 0) {
                        // 确保元素都加载完成后再初始化
                        observer.disconnect();
                        createToggleButton();
                        createModifierPanel();
                        setupKeyboardShortcuts(); // 添加键盘快捷键
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 应用所有修改
    function applyAllModifications() {
        // 修改头像和用户名
        const avatarUrl = document.getElementById('avatar-input').value;
        const username = document.getElementById('username-input').value;

        if(avatarUrl) {
            const avatarImg = document.querySelector(SELECTORS.AVATAR);
            if(avatarImg) avatarImg.src = avatarUrl;
        }

        if(username) {
            const usernameElement = document.querySelector(SELECTORS.USERNAME);
            if(usernameElement) usernameElement.textContent = username;
        }

        // 修改数据卡片
        document.querySelectorAll('.field-group[data-card-id]').forEach(group => {
            const cardId = group.getAttribute('data-card-id');
            const card = document.querySelector(`[data-btm="${cardId}"]`);
            if(!card) return;

            const title = group.querySelector('.field-header').textContent.trim();
            const isRefund = isRefundField(title);
            const fieldConfig = isRefund ? FIELD_CONFIGS.refund : FIELD_CONFIGS.default;

            // 获取输入值
            const value = group.querySelector('.value-input')?.value;
            const trend = group.querySelector('.trend-select')?.value;
            const ratio = group.querySelector('.ratio-input')?.value;
            const exceedRatio = fieldConfig.includes('exceed') ? group.querySelector('.exceed-ratio')?.value : null;
            const excellentValue = fieldConfig.includes('excellent') ? group.querySelector('.excellent-value')?.value : null;

            // 修改主数值
            if(value) {
                const valueElement = card.querySelector(SELECTORS.VALUE);
                if(valueElement) {
                    const formattedValue = isMoneyField(title) ? formatters.formatMoney(value) : value;
                    valueElement.textContent = formattedValue;
                }
            }

            // 修改趋势和变化率
            if(ratio) {
                const ratioElement = card.querySelector(SELECTORS.RATIO);
                if(ratioElement) {
                    ratioElement.className = `value-P9UU1b ${trend === 'up' ? 'up-uranyB' : 'down-OAkhZz'} cp-change-ratio-value`;
                    ratioElement.textContent = formatters.formatPercent(ratio);
                }

                const trendElement = card.querySelector(SELECTORS.TREND);
                if(trendElement) {
                    trendElement.innerHTML = trend === 'up' ? getUpArrowSVG() : getDownArrowSVG();
                }
            }

            // 只有非退款字段才修改底部数据
            if (!isRefund) {
                const bottomItems = card.querySelectorAll(SELECTORS.BOTTOM_ITEMS);
                if(bottomItems[0] && exceedRatio) {
                    bottomItems[0].textContent = `超过同行同级${formatters.formatExceedRatio(exceedRatio)}的商家`;
                }
                if(bottomItems[1] && excellentValue) {
                    const formattedValue = isMoneyField(title) ? 
                        formatters.formatMoney(excellentValue) : 
                        excellentValue.toString().endsWith('%') ? excellentValue : excellentValue;
                    bottomItems[1].textContent = `同行同级优秀值${formattedValue}`;
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

    // 初始化
    observeDOM();
})();
