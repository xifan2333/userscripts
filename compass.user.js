// ==UserScript==
// @name         抖店数据面板修改器
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  修改抖店数据面板的显示内容
// @author       xifan
// @match        https://compass.jinritemai.com/shop/business-part*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jinritemai.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建修改面板的样式
    const style = document.createElement('style');
    style.textContent = `
        .data-modifier-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            z-index: 9999;
            width: 300px;
        }
        .data-modifier-panel input {
            width: 100%;
            margin: 5px 0;
            padding: 5px;
        }
        .data-modifier-panel button {
            margin: 5px;
            padding: 5px 10px;
        }
        .trend-selector {
            margin: 5px 0;
        }
    `;
    document.head.appendChild(style);

    // 创建修改面板
    function createModifierPanel() {
        const panel = document.createElement('div');
        panel.className = 'data-modifier-panel';
        panel.innerHTML = `
            <h3>数据修改面板</h3>
            <input type="text" id="value-input" placeholder="数值">
            <div class="trend-selector">
                趋势:
                <select id="trend-select">
                    <option value="up">上升</option>
                    <option value="down">下降</option>
                </select>
            </div>
            <input type="text" id="ratio-input" placeholder="变化率(例: 20%)">
            <button id="apply-btn">应用修改</button>
        `;
        document.body.appendChild(panel);

        // 添加事件监听
        document.getElementById('apply-btn').addEventListener('click', applyModification);
    }

    // 应用修改
    function applyModification() {
        const value = document.getElementById('value-input').value;
        const trend = document.getElementById('trend-select').value;
        const ratio = document.getElementById('ratio-input').value;

        // 获取选中的卡片
        const activeCard = document.querySelector('.active_card');
        if (!activeCard) return;

        // 修改数值
        const valueElement = activeCard.querySelector('.value-KaSdAo span span:last-child');
        if (valueElement) {
            valueElement.textContent = value;
        }

        // 修改趋势和变化率
        const ratioElement = activeCard.querySelector('.cp-change-ratio-value');
        if (ratioElement) {
            ratioElement.className = `value-P9UU1b ${trend === 'up' ? 'up-uranyB' : 'down-OAkhZz'} cp-change-ratio-value`;
            ratioElement.textContent = ratio;
        }

        // 修改趋势箭头
        const trendElement = activeCard.querySelector('.cp-change-ratio-trend');
        if (trendElement) {
            trendElement.innerHTML = trend === 'up' ? getUpArrowSVG() : getDownArrowSVG();
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

    // 等待页面加载完成后初始化
    function init() {
        if (document.querySelector('.overviewContainer-HrpFrv')) {
            createModifierPanel();
        } else {
            setTimeout(init, 1000); // 每秒检查一次直到页面加载完成
        }
    }

    init();
})();
