// ==UserScript==
// @name         抖店店铺信息修改器
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  修改抖店店铺信息的显示内容
// @author       xifan
// @match        https://fxg.jinritemai.com/ffa/grs/qualification/shopinfo*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jinritemai.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // 首先定义基础UI颜色
    const UI_COLORS = {
        PRIMARY: '#1966ff',
        SECONDARY: '#666',
        TEXT: '#666',
        LIGHT_PRIMARY: '#e6f7ff',
        BORDER_PRIMARY: '#91caff'
    };

    // 然后定义 CONFIG 对象
    const CONFIG = {
        // UI相关配置
        UI: {
            PANEL_WIDTH: '300px',
            BUTTON_POSITION: {
                TOP: '16px',
                RIGHT: '320px'
            },
            COLORS: UI_COLORS
        },
        
        // DOM选择器
        SELECTORS: {
            SHOP_INFO_ROWS: '.ant-row._3aJWiCG93IlaU_3qf7a1Uc',
            SHOP_INFO_VALUE: '.ant-col._2oUK91ircK4AKJrKQ8fyHD span',
            SHOP_LOGO_CONTAINER: '.ant-col._2oUK91ircK4AKJrKQ8fyHD',
            SHOP_LOGO_WRAPPER: '._20A2KZACEvbF-ww-sCTfNo',
            SHOP_LOGO_IMAGE: '._3duiZdUahHyw8H7MW-2zvW',
            MANAGER_INFO_ROWS: '.ant-row.index__row--D9_4Q',
            MANAGER_INFO_VALUE: '.index__text--uvgln span',
            
        },

        // 必需的DOM元素
        REQUIRED_ELEMENTS: {
            CONTAINER: 'div[__garfishmockbody__]',
            SHOP_INFO: '.qgfKbnWwYvvi-yj8P89Gr',
            MANAGER_INFO: '.index__body--tArAl'
        },

        // 样式配置
        STYLES: {
            PANEL: `
                .shop-modifier-panel {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    z-index: 9999;
                    width: 300px;
                    display: none;
                    max-height: calc(100vh - 32px);
                    overflow-y: auto;
                }`,
            BUTTON: `
                .toggle-button {
                    position: absolute;
                    top: 16px;
                    right: 320px;
                    z-index: 10000;
                    padding: 5px 10px;
                    background: #1966ff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }`,
            FIELDS: `
                .field-row {
                    margin-bottom: 12px;
                }
                .field-row label {
                    display: block;
                    margin-bottom: 4px;
                    color: #666;
                    font-size: 13px;
                }
                .field-row input[type="text"] {
                    width: 100%;
                    padding: 6px 32px 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 13px;
                    height: 32px;
                }
                .field-row .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }`,
            BUTTONS: `
                .button-group {
                    display: flex;
                    gap: 8px;
                    margin-top: 15px;
                }
                .button-group button {
                    height: 36px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .apply-btn {
                    flex: 1;
                    background: #1966ff;
                    color: white;
                }
                .hide-btn {
                    width: 100%;
                    margin-top: 8px;
                    background: #666;
                    color: white;
                    height: 36px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }`,
            CHECKBOX: `
                input[type="checkbox"] {
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
                    vertical-align: middle;
                }
                input[type="checkbox"]:checked {
                    background: ${UI_COLORS.PRIMARY};
                    border-color: ${UI_COLORS.PRIMARY};
                }
                input[type="checkbox"]:checked::after {
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
                input[type="checkbox"]:hover {
                    border-color: ${UI_COLORS.PRIMARY};
                }
            `
        },

        // 字段配置
        FIELDS: {
            SHOP: [
                { id: 'shop-id', label: '店铺 ID', placeholder: '输入店铺 ID' },
                { id: 'shop-type', label: '店铺类型', placeholder: '输入店铺类型' },
                { id: 'shop-name', label: '店铺名称', placeholder: '输入店铺名称' },
                { id: 'shop-logo', label: '店铺 Logo URL', placeholder: '输入 Logo 图片 URL' },
                { id: 'business-address', label: '经营地址', placeholder: '输入经营地址' },
                { id: 'small-business', label: '小额零星经营', type: 'checkbox' },
                { id: 'manager-name', label: '管理人姓名', placeholder: '输入管理人姓名' },
                { id: 'manager-phone', label: '管理人电话', placeholder: '输入管理人电话' }
            ]
        },

        // 添加通知配置
        NOTIFICATIONS: {
            SUCCESS: {
                DURATION: 2000,
                BACKGROUND: '#4caf50',
                COLOR: 'white'
            },
            ERROR: {
                DURATION: 3000,
                BACKGROUND: '#f44336',
                COLOR: 'white'
            }
        },
        
        // 添加历史记录配置
        HISTORY: {
            MAX_RECORDS: 10,
            STORAGE_KEY: 'modifyHistory'
        },

        // 历史记录对话框的样式配置
        DIALOG_STYLES: {
            CONTAINER: `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0,0,0,0.2);
                z-index: 10002;
                width: 480px;
                display: flex;
                flex-direction: column;
                max-height: 600px;
            `,
            HEADER: `
                position: relative;
                padding: 16px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            `,
            TITLE: `
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #333;
            `,
            CLOSE_BUTTON: `
                position: absolute;
                right: 16px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 20px;
                color: #999;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                line-height: 1;
            `,
            CONTENT: `
                padding: 0;
                overflow-y: auto;
                flex-grow: 1;
            `,
            RECORD: `
                padding: 12px 20px;
                border-bottom: 1px solid #f0f0f0;
                position: relative;
                transition: background-color 0.2s;
                cursor: pointer;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            `,
            RECORD_CONTENT: `
                flex: 1;
                min-width: 0;
            `,
            CHECKBOX_WRAPPER: `
                flex: 0 0 auto;
                padding-top: 2px;
            `,
            CHECKBOX: `
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border: 1px solid #999;
                border-radius: 2px;
                margin: 0;
                cursor: pointer;
                position: relative;
                background: white;
                flex-shrink: 0;
                display: inline-block;
            `,
            CHECKBOX_CHECKED: `
                background: ${UI_COLORS.PRIMARY};
                border-color: ${UI_COLORS.PRIMARY};
            `,
            CHECKBOX_CHECKED_AFTER: `
                content: '';
                position: absolute;
                left: 5px;
                top: 2px;
                width: 4px;
                height: 8px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            `,
            TIME: `
                color: #999;
                font-size: 12px;
                margin-bottom: 4px;
            `,
            FIELDS: `
                font-size: 13px;
                color: #333;
                display: flex;
                flex-wrap: wrap;
                gap: 4px 8px;
            `,
            FIELD_TAG: `
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 4px;
                color: #666;
                font-size: 12px;
            `,
            ACTIONS: `
                display: none;
                position: absolute;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                gap: 8px;
            `,
            RESTORE_BUTTON: `
                background: ${UI_COLORS.PRIMARY};
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            `,
            TOOLBAR: `
                padding: 12px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f9f9f9;
                flex-shrink: 0;
            `,
            DELETE_BUTTON: `
                background: #ff4d4f;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                opacity: 0.8;
            `,
            FIELD_CLEAR_BUTTON: `
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                padding: 4px;
                font-size: 16px;
                display: none;
                line-height: 1;
                z-index: 1;
            `,
            RESET_BUTTON: `
                background: #ff4d4f;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                min-width: 80px;
            `,
            FIELD_LABEL: `
                display: inline-block;
                padding: 2px 6px;
                border: 1px solid ${UI_COLORS.BORDER_PRIMARY};
                border-radius: 4px;
                color: ${UI_COLORS.PRIMARY};
                font-size: 12px;
                background: transparent;
                margin-right: 4px;
            `,
            FIELD_VALUE: `
                color: #333;
                font-size: 12px;
                margin-left: 2px;
            `,
            TOOLBAR_BUTTON: `
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                transition: opacity 0.2s;
            `,
            APPLY_BUTTON: `
                background: ${UI_COLORS.PRIMARY};
                color: white;
                &:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `,
            DELETE_BUTTON: `
                background: #ff4d4f;
                color: white;
                &:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `
        }
    };

    // 样式初始化
    function initStyles() {
        const style = document.createElement('style');
        style.textContent = Object.values(CONFIG.STYLES).join('\n');
        document.head.appendChild(style);
    }

    // 创建修改面板
    function createModifierPanel() {
        const panel = document.createElement('div');
        panel.className = 'shop-modifier-panel';
        
        // 动态生成字段
        const fieldsHTML = CONFIG.FIELDS.SHOP.map(field => {
            if (field.type === 'checkbox') {
                return `
                    <div class="field-row">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="${field.id}">
                            <span style="margin-left: 8px;">${field.label}</span>
                        </label>
                    </div>
                `;
            }
            return `
                <div class="field-row">
                    <label>${field.label}</label>
                    <div class="input-wrapper">
                        <input type="text" id="${field.id}" placeholder="${field.placeholder}">
                        <button class="field-clear-button" style="${CONFIG.DIALOG_STYLES.FIELD_CLEAR_BUTTON}">×</button>
                    </div>
                </div>
            `;
        }).join('');
        
        panel.innerHTML = `
            ${fieldsHTML}
            <div class="button-group">
                <button class="apply-btn">应用修改</button>
                <button class="reset-btn" style="${CONFIG.DIALOG_STYLES.RESET_BUTTON}">重置表单</button>
            </div>
            <button class="hide-btn">隐藏 [y]</button>
        `;
    
        // 添加字段清除按钮事件
        panel.querySelectorAll('.field-row').forEach(row => {
            const input = row.querySelector('input[type="text"]');
            const clearBtn = row.querySelector('.field-clear-button');
            if (input && clearBtn) {
                // 初始状态检查
                clearBtn.style.display = input.value ? 'block' : 'none';
                
                input.addEventListener('input', () => {
                    clearBtn.style.display = input.value ? 'block' : 'none';
                });
                clearBtn.onclick = (e) => {
                    e.preventDefault(); // 防止失去焦点
                    input.value = '';
                    clearBtn.style.display = 'none';
                    input.focus();
                };
            }
        });
    
        // 修改重置按钮事件
        const resetBtn = panel.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                // 重置所有输入框
                panel.querySelectorAll('input[type="text"]').forEach(input => {
                    input.value = '';
                    const clearBtn = input.parentElement.querySelector('.field-clear-button');
                    if (clearBtn) {
                        clearBtn.style.display = 'none';
                    }
                });
                
                // 重置复选框
                panel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // 重新初始化值
                const managerInfoRows = document.querySelectorAll(CONFIG.SELECTORS.MANAGER_INFO_ROWS);
                managerInfoRows.forEach(row => {
                    const label = row.textContent.trim();
                    const valueElement = row.querySelector(CONFIG.SELECTORS.MANAGER_INFO_VALUE);
                    
                    if (!valueElement) return;
    
                    if (label.includes('管理人姓名')) {
                        document.getElementById('manager-name').value = valueElement.textContent || '';
                    }
                    else if (label.includes('管理人手机号')) {
                        const phone = valueElement.textContent.replace(/[^\d]/g, '');
                        document.getElementById('manager-phone').value = phone;
                    }
                });
    
                // 显示提示
                NotificationUtils.show('已重置表单');
            };
            
            // 添加悬停效果
            resetBtn.onmouseover = () => resetBtn.style.opacity = '0.9';
            resetBtn.onmouseout = () => resetBtn.style.opacity = '1';
        }
    
        return panel;
    }
    

    // 创建切换按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'toggle-button';
        button.textContent = '修改 [x]';
        button.style.background = CONFIG.UI.COLORS.PRIMARY;
        
        const container = document.querySelector(CONFIG.REQUIRED_ELEMENTS.CONTAINER);
        if (container) {
            container.style.position = 'relative';
            container.appendChild(button);
        } else {
            document.body.appendChild(button);
        }
        
        return button;
    }

    // 新增工具函数
    const DOMUtils = {
        updateTextContent(selector, value) {
            const element = document.querySelector(selector);
            if (element && value) {
                element.textContent = value;
            }
        },

        createShopInfoRow(field, value) {
            const row = document.createElement('div');
            row.setAttribute('data-field', field);
            row.innerHTML = `
                <div class="ant-row _3aJWiCG93IlaU_3qf7a1Uc" style="margin: -8px -8px 8px;">
                    <div class="ant-col _7Qygb3VmS0-7XcXX446U4" style="padding: 8px; color: rgb(85, 88, 92); flex: 0 0 170px;">
                        ${CONFIG.FIELDS.SHOP.find(f => f.id === field)?.label || field}
                    </div>
                    <div class="ant-col _2oUK91ircK4AKJrKQ8fyHD" style="padding: 8px; flex: 1 1 auto;">
                        <span>${value || ''}</span>
                    </div>
                </div>
            `;
            return row;
        }
    };

    // 添加数据持久化工具
    const StorageUtils = {
        // 保存修改历史
        saveHistory(values) {
            try {
                const history = GM_getValue('modifyHistory', []);
                history.unshift({
                    timestamp: Date.now(),
                    values: values
                });
                // 只保留最近10条记录
                if (history.length > 10) history.pop();
                GM_setValue('modifyHistory', history);
            } catch (error) {
                console.error('保存历史记录失败:', error);
            }
        },

        // 获取最近的修改记录
        getLastModification() {
            try {
                const history = GM_getValue('modifyHistory', []);
                return history[0]?.values || null;
            } catch (error) {
                console.error('获取历史记录失败:', error);
                return null;
            }
        },

        // 获取完整历史记录
        getFullHistory() {
            try {
                return GM_getValue(CONFIG.HISTORY.STORAGE_KEY, []);
            } catch (error) {
                ErrorUtils.handleError(error, 'getFullHistory');
                return [];
            }
        },
        
        // 清除历史记录
        clearHistory() {
            try {
                GM_setValue(CONFIG.HISTORY.STORAGE_KEY, []);
                return true;
            } catch (error) {
                ErrorUtils.handleError(error, 'clearHistory');
                return false;
            }
        },

        setFullHistory(history) {
            try {
                GM_setValue(CONFIG.HISTORY.STORAGE_KEY, history);
            } catch (error) {
                ErrorUtils.handleError(error, 'setFullHistory');
            }
        }
    };

    // 添加错误处理工具
    const ErrorUtils = {
        handleError(error, context) {
            console.error(`Error in ${context}:`, error);
            // 可以在这里添加错误提示UI
            alert(`操作失败: ${error.message}`);
        }
    };

    // 添加通知工具
    const NotificationUtils = {
        show(message, type = 'SUCCESS') {
            const notification = document.createElement('div');
            const config = CONFIG.NOTIFICATIONS[type];
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 10px 20px;
                border-radius: 4px;
                background: ${config.BACKGROUND};
                color: ${config.COLOR};
                z-index: 10001;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: opacity 0.3s;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, config.DURATION);
        }
    };

    // 修改 ShopModifier 类，添加错误处理和数据持久化
    class ShopModifier {
        constructor() {
            this.panel = null;
            this.button = null;
            this.initialized = false;
            this.historyDialog = null; // 添加历史对话框引用
        }

        // 初始化应用
        init() {
            initStyles();
            this.setupMutationObserver();
        }

        // 设置DOM观察器
        setupMutationObserver() {
            const observer = new MutationObserver((mutations) => {
                if (this.initialized) return;
                
                const container = document.querySelector(CONFIG.REQUIRED_ELEMENTS.CONTAINER);
                const shopInfo = document.querySelector(CONFIG.REQUIRED_ELEMENTS.SHOP_INFO);
                const managerInfo = document.querySelector(CONFIG.REQUIRED_ELEMENTS.MANAGER_INFO);

                if (container && shopInfo && managerInfo) {
                    observer.disconnect();
                    this.onDOMReady(container);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // DOM准备就绪后的处理
        onDOMReady(container) {
            try {
                this.initialized = true;
                container.style.position = 'relative';
                
                // 先创建面板
                this.panel = createModifierPanel();
                container.appendChild(this.panel); // 添加面板到容器
                
                // 创建按钮
                this.button = createToggleButton();
                container.appendChild(this.button);
                
                // 创建历史按钮
                this.createHistoryPanel();
                
                // 设置事件��听
                this.setupEventListeners();
                
                // 尝试恢复最近的修改或初始化值
                const lastValues = StorageUtils.getLastModification();
                if (lastValues) {
                    this.restoreValues(lastValues);
                } else {
                    initPanelValues();
                }
            } catch (error) {
                ErrorUtils.handleError(error, 'onDOMReady');
            }
        }

        // 设置事件监听器
        setupEventListeners() {
            // 面板显示/隐藏
            this.button.onclick = () => {
                this.togglePanel(true);
            };

            // 隐藏按钮
            const hideButton = this.panel.querySelector('.hide-btn');
            if (hideButton) {
                hideButton.onclick = () => this.togglePanel(false);
            }
            
            // 应用修改按钮
            const applyButton = this.panel.querySelector('.apply-btn');
            if (applyButton) {
                applyButton.onclick = () => this.applyModifications();
            }
            
            // 键盘快捷键
            document.addEventListener('keydown', this.handleKeyPress.bind(this));
        }

        // 处理键盘事件
        handleKeyPress(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key === 'x') {
                this.togglePanel(true);
            } else if (key === 'y') {
                // 隐藏所有面板和按钮
                this.hideAll();
            } else if (key === 'h') {
                if (this.historyDialog) {
                    this.closeHistoryDialog();
                } else {
                    this.showHistoryDialog();
                }
            }
        }

        // 切换面板显示状态
        togglePanel(show) {
            if (this.panel) {
                this.panel.style.display = show ? 'block' : 'none';
            }
            
       
            const buttons = document.querySelectorAll('.toggle-button');
            buttons.forEach(button => {
                if (button.textContent.includes('修改') || button.textContent.includes('历史')) {
                    button.style.display = 'block'; // 修改按钮始终显示
                } else {
                    button.style.display = show ? 'block' : 'none'; // 其他按钮跟随面板显示状态
                }
            });
        }

        // 添加恢复值的方法
        restoreValues(values) {
            try {
                Object.entries(values).forEach(([id, value]) => {
                    const input = document.getElementById(id);
                    if (!input) return;

                    if (input.type === 'checkbox') {
                        input.checked = value === '是';
                    } else {
                        input.value = value;
                    }
                });
            } catch (error) {
                ErrorUtils.handleError(error, 'restoreValues');
            }
        }

        // 修改应用修改的方法
        applyModifications() {
            try {
                const values = getFormValues();
                this.updateShopInfo(values);
                this.updateManagerInfo(values);
                this.updateCustomFields(values);
                
                StorageUtils.saveHistory(values);
                NotificationUtils.show('修改已应用');
                
                // 自动隐藏面板
                this.togglePanel(false);
            } catch (error) {
                ErrorUtils.handleError(error, 'applyModifications');
                NotificationUtils.show('修改失败: ' + error.message, 'ERROR');
            }
        }

        // 添加历史记录面板
        createHistoryPanel() {
            const historyButton = document.createElement('button');
            historyButton.className = 'toggle-button';
            historyButton.style.right = '420px';
            historyButton.textContent = '历史 [h]';
            
            historyButton.onclick = () => {
                if (this.historyDialog) {
                    this.closeHistoryDialog();
                } else {
                    this.showHistoryDialog();
                }
            };
            
            const container = document.querySelector(CONFIG.REQUIRED_ELEMENTS.CONTAINER);
            container.appendChild(historyButton);
        }

        // 修改显示历史记录对话框方法
        showHistoryDialog() {
            if (this.historyDialog) return;

            const history = StorageUtils.getFullHistory();
            const dialog = document.createElement('div');
            this.historyDialog = dialog;
            dialog.style.cssText = CONFIG.DIALOG_STYLES.CONTAINER;

            // 创建头部
            const header = document.createElement('div');
            header.style.cssText = CONFIG.DIALOG_STYLES.HEADER;
            header.innerHTML = `
                <h3 style="${CONFIG.DIALOG_STYLES.TITLE}">修改历史</h3>
                <button style="${CONFIG.DIALOG_STYLES.CLOSE_BUTTON}">×</button>
            `;
            header.querySelector('button').onclick = () => this.closeHistoryDialog();

            // 修改工具栏
            const toolbar = document.createElement('div');
            toolbar.style.cssText = CONFIG.DIALOG_STYLES.TOOLBAR;
            toolbar.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <button class="apply-selected" style="${CONFIG.DIALOG_STYLES.TOOLBAR_BUTTON}; ${CONFIG.DIALOG_STYLES.APPLY_BUTTON}" disabled>
                        应用
                    </button>
                    <button class="delete-selected" style="${CONFIG.DIALOG_STYLES.TOOLBAR_BUTTON}; ${CONFIG.DIALOG_STYLES.DELETE_BUTTON}" disabled>
                        删除
                    </button>
                </div>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" style="${CONFIG.DIALOG_STYLES.CHECKBOX}">
                    <span style="font-size: 13px;">全选</span>
                </label>
            `;

            // 创建内容容器
            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = CONFIG.DIALOG_STYLES.CONTENT;

            if (history.length === 0) {
                contentContainer.innerHTML = `
                    <div style="padding: 40px 0; text-align: center; color: #999;">
                        暂无历史记录
                    </div>
                `;
            } else {
                const selectedRecords = new Set();

                history.forEach((record, index) => {
                    const recordDiv = document.createElement('div');
                    recordDiv.style.cssText = CONFIG.DIALOG_STYLES.RECORD;
                    
                    const changedFields = Object.entries(record.values)
                        .filter(([_, value]) => value !== '')
                        .map(([key, value]) => {
                            const field = CONFIG.FIELDS.SHOP.find(f => f.id === key);
                            return `
                                <div style="display: inline-flex; align-items: center; margin-right: 8px;">
                                    <span style="${CONFIG.DIALOG_STYLES.FIELD_LABEL}">${field?.label || key}</span>
                                    <span style="${CONFIG.DIALOG_STYLES.FIELD_VALUE}">${value}</span>
                                </div>
                            `;
                        }).join('');

                    recordDiv.innerHTML = `
                        <div style="${CONFIG.DIALOG_STYLES.CHECKBOX_WRAPPER}">
                            <input type="checkbox" style="${CONFIG.DIALOG_STYLES.CHECKBOX}">
                        </div>
                        <div style="${CONFIG.DIALOG_STYLES.RECORD_CONTENT}">
                            <div style="${CONFIG.DIALOG_STYLES.TIME}">
                                ${new Date(record.timestamp).toLocaleString()}
                            </div>
                            <div style="${CONFIG.DIALOG_STYLES.FIELDS}">
                                ${changedFields}
                            </div>
                        </div>
                        <div style="${CONFIG.DIALOG_STYLES.ACTIONS}">
                            <button style="${CONFIG.DIALOG_STYLES.RESTORE_BUTTON}">恢复</button>
                        </div>
                    `;

                    // 添加复选框选中状态的样式处理
                    const checkbox = recordDiv.querySelector('input[type="checkbox"]');
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            this.style.cssText = `${CONFIG.DIALOG_STYLES.CHECKBOX} ${CONFIG.DIALOG_STYLES.CHECKBOX_CHECKED}`;
                            this.style.setProperty('--after-styles', CONFIG.DIALOG_STYLES.CHECKBOX_CHECKED_AFTER);
                        } else {
                            this.style.cssText = CONFIG.DIALOG_STYLES.CHECKBOX;
                        }
                    });

                    // 添加复选框的伪元素样式
                    const style = document.createElement('style');
                    style.textContent = `
                        input[type="checkbox"]:checked::after {
                            ${CONFIG.DIALOG_STYLES.CHECKBOX_CHECKED_AFTER}
                        }
                    `;
                    document.head.appendChild(style);

                    // 添加鼠标悬停效果
                    recordDiv.onmouseenter = () => {
                        recordDiv.style.backgroundColor = '#f9f9f9';
                        recordDiv.querySelector('[style*="ACTIONS"]').style.display = 'flex';
                    };
                    recordDiv.onmouseleave = () => {
                        recordDiv.style.backgroundColor = '';
                        recordDiv.querySelector('[style*="ACTIONS"]').style.display = 'none';
                    };
                    // 修改复选框事件处理
                    checkbox.onclick = (e) => {
                        if (e.target.checked) {
                            selectedRecords.add(index);
                        } else {
                            selectedRecords.delete(index);
                        }
                        
                        const applyButton = toolbar.querySelector('.apply-selected');
                        const deleteButton = toolbar.querySelector('.delete-selected');
                        
                        // 更新按钮状态和样式
                        applyButton.disabled = selectedRecords.size !== 1;
                        deleteButton.disabled = selectedRecords.size === 0;
                        
                        // 添加禁用时的样式
                        applyButton.style.opacity = applyButton.disabled ? '0.5' : '1';
                        applyButton.style.cursor = applyButton.disabled ? 'not-allowed' : 'pointer';
                        deleteButton.style.opacity = deleteButton.disabled ? '0.5' : '1';
                        deleteButton.style.cursor = deleteButton.disabled ? 'not-allowed' : 'pointer';
                        
                        // 更新全选框状态
                        toolbar.querySelector('input[type="checkbox"]').checked = 
                            selectedRecords.size === history.length;
                    };

                    recordDiv.querySelector('button').onclick = () => this.applyHistoryRecord(index);
                    contentContainer.appendChild(recordDiv);
                });

                // 修改全选功能
                const selectAllCheckbox = toolbar.querySelector('input[type="checkbox"]');
                selectAllCheckbox.onclick = (e) => {
                    const checkboxes = contentContainer.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach((cb, index) => {
                        cb.checked = e.target.checked;
                        if (e.target.checked) {
                            selectedRecords.add(index);
                        } else {
                            selectedRecords.delete(index);
                        }
                    });
                    
                    const applyButton = toolbar.querySelector('.apply-selected');
                    const deleteButton = toolbar.querySelector('.delete-selected');
                    
                    // 更新按钮状态和样式
                    applyButton.disabled = selectedRecords.size !== 1;
                    deleteButton.disabled = selectedRecords.size === 0;
                    
                    // 添加禁用时的样式
                    applyButton.style.opacity = applyButton.disabled ? '0.5' : '1';
                    applyButton.style.cursor = applyButton.disabled ? 'not-allowed' : 'pointer';
                    deleteButton.style.opacity = deleteButton.disabled ? '0.5' : '1';
                    deleteButton.style.cursor = deleteButton.disabled ? 'not-allowed' : 'pointer';
                };

                // 修改应用按钮事件
                toolbar.querySelector('.apply-selected').onclick = () => {
                    if (selectedRecords.size !== 1) {
                        NotificationUtils.show('只能应用一条记录', 'ERROR');
                        return;
                    }
                    const selectedIndex = Array.from(selectedRecords)[0];
                    this.applyHistoryRecord(selectedIndex);
                };

                // 修改删除按钮事件
                toolbar.querySelector('.delete-selected').onclick = () => {
                    const newHistory = history.filter((_, index) => !selectedRecords.has(index));
                    StorageUtils.setFullHistory(newHistory);
                    this.closeHistoryDialog();
                    this.showHistoryDialog();
                    NotificationUtils.show('已删除选中记录');
                };
            }

            dialog.appendChild(header);
            dialog.appendChild(toolbar);
            dialog.appendChild(contentContainer);
            document.body.appendChild(dialog);
        }

        // 添加关闭历史对话框方法
        closeHistoryDialog() {
            if (this.historyDialog) {
                this.historyDialog.remove();
                this.historyDialog = null;
            }
        }

        // 添加应用史记录方法
        applyHistoryRecord(index) {
            try {
                const history = StorageUtils.getFullHistory();
                const record = history[index];
                if (record) {
                    // 恢复表单值
                    this.restoreValues(record.values);
                    // 应用修改
                    this.applyModifications();
                    // 关闭历史对话框
                    this.closeHistoryDialog();
                    // 显示成功提示
                    NotificationUtils.show('已恢复历史记录');
                }
            } catch (error) {
                ErrorUtils.handleError(error, 'applyHistoryRecord');
            }
        }

        // 修改 updateShopInfo 方法，使用 DOMUtils
        updateShopInfo(values) {
            try {
                const shopInfoRows = document.querySelectorAll(CONFIG.SELECTORS.SHOP_INFO_ROWS);
                shopInfoRows.forEach(row => {
                    const label = row.textContent.trim();
                    const valueContainer = row.querySelector(CONFIG.SELECTORS.SHOP_INFO_VALUE);
                    
                    if (label.includes('店铺logo') && values['shop-logo']) {
                        const logoContainer = row.querySelector(CONFIG.SELECTORS.SHOP_LOGO_CONTAINER);
                        if (logoContainer) {
                            // 检查是否已存在logo结构
                            let logoWrapper = logoContainer.querySelector(CONFIG.SELECTORS.SHOP_LOGO_WRAPPER);
                            let logoImage = logoContainer.querySelector(CONFIG.SELECTORS.SHOP_LOGO_IMAGE);
                            
                            if (!logoWrapper) {
                                // 如果不存在，创建完整的logo结构
                                logoContainer.innerHTML = `
                                    <div class="${CONFIG.SELECTORS.SHOP_LOGO_WRAPPER.substr(1)}">
                                        <div class="${CONFIG.SELECTORS.SHOP_LOGO_IMAGE.substr(1)}"
                                             style="background-image: url('${values['shop-logo']}');">
                                        </div>
                                    </div>
                                `;
                            } else if (logoImage) {
                                // 如果存在，只更新图片URL
                                logoImage.style.backgroundImage = `url('${values['shop-logo']}')`;
                            }
                        }
                        return;
                    }
                    
                    // 处理他字段
                    if (!valueContainer) return;
                    
                    if (label.includes('店铺ID') && values['shop-id']) {
                        valueContainer.textContent = values['shop-id'];
                    }
                    else if (label.includes('店铺类型') && values['shop-type']) {
                        valueContainer.textContent = values['shop-type'];
                    }
                    else if (label.includes('店铺名称') && values['shop-name']) {
                        valueContainer.textContent = values['shop-name'];
                    }
                });
            } catch (error) {
                ErrorUtils.handleError(error, 'updateShopInfo');
            }
        }

        // 修改 updateCustomFields 方法，使用 DOMUtils
        updateCustomFields(values) {
            try {
                const lastShopInfoRow = document.querySelector(`${CONFIG.SELECTORS.SHOP_INFO_ROWS}:last-child`);
                if (!lastShopInfoRow) return;

                const parentElement = lastShopInfoRow.parentElement;
                
                // 更新经营地址
                if (values['business-address']) {
                    const existingAddress = document.querySelector('[data-field="business-address"]');
                    if (!existingAddress) {
                        parentElement.appendChild(
                            DOMUtils.createShopInfoRow('business-address', values['business-address'])
                        );
                    } else {
                        DOMUtils.updateTextContent('[data-field="business-address"] span', values['business-address']);
                    }
                }
                
                // 更新小额零星经营
                const existingSmallBusiness = document.querySelector('[data-field="small-business"]');
                if (values['small-business']) {
                    // 如果值为"是"，则创建或更新
                    if (!existingSmallBusiness) {
                        parentElement.appendChild(
                            DOMUtils.createShopInfoRow('small-business', values['small-business'])
                        );
                    } else {
                        DOMUtils.updateTextContent('[data-field="small-business"] span', values['small-business']);
                    }
                } else if (existingSmallBusiness) {
                    // 如果没有值且元素存在，则移除该元素
                    existingSmallBusiness.remove();
                }
            } catch (error) {
                ErrorUtils.handleError(error, 'updateCustomFields');
            }
        }

        // 添加缺失的 updateManagerInfo 方法
        updateManagerInfo(values) {
            try {
                const managerInfoRows = document.querySelectorAll(CONFIG.SELECTORS.MANAGER_INFO_ROWS);
                managerInfoRows.forEach(row => {
                    const label = row.textContent.trim();
                    const valueSpan = row.querySelector(CONFIG.SELECTORS.MANAGER_INFO_VALUE);
                    
                    if (!valueSpan) return;

                    if (label.includes('管理人姓名') && values['manager-name']) {
                        valueSpan.textContent = values['manager-name'];
                    }
                    else if (label.includes('管理人手机号') && values['manager-phone']) {
                        valueSpan.textContent = values['manager-phone'];
                    }
                });
            } catch (error) {
                ErrorUtils.handleError(error, 'updateManagerInfo');
            }
        }

        // 修改 hideAll 方法
        hideAll() {
            // 隐藏修改面板
            if (this.panel) {
                this.panel.style.display = 'none';
            }
            
            // 隐藏历史对话框
            if (this.historyDialog) {
                this.closeHistoryDialog();
            }
            
            // 隐藏所有按钮，包括修改按钮
            const buttons = document.querySelectorAll('.toggle-button');
            buttons.forEach(button => {
                button.style.display = 'none';
            });
        }
    }

    // 添加初始化面板值的函数
    function initPanelValues() {
        const shopInfoRows = document.querySelectorAll(CONFIG.SELECTORS.SHOP_INFO_ROWS);
        shopInfoRows.forEach(row => {
            const label = row.textContent.trim();
            const valueContainer = row.querySelector(CONFIG.SELECTORS.SHOP_INFO_VALUE);
            
            if (!valueContainer) return;

            if (label.includes('店铺ID')) {
                document.getElementById('shop-id').value = valueContainer.querySelector('span')?.textContent || '';
            }
            else if (label.includes('店铺类型')) {
                document.getElementById('shop-type').value = valueContainer.querySelector('span')?.textContent || '';
            }
            else if (label.includes('店铺名称')) {
                document.getElementById('shop-name').value = valueContainer.querySelector('span')?.textContent || '';
            }
            else if (label.includes('店铺logo')) {
                const logoElement = row.querySelector(CONFIG.SELECTORS.SHOP_LOGO_WRAPPER);
                if (logoElement) {
                    const logoUrl = logoElement.style.backgroundImage.replace(/url\(['"](.+)['"]\)/, '$1');
                    document.getElementById('shop-logo').value = logoUrl;
                }
            }
        });

        const managerInfoRows = document.querySelectorAll(CONFIG.SELECTORS.MANAGER_INFO_ROWS);
        managerInfoRows.forEach(row => {
            const label = row.textContent.trim();
            const valueElement = row.querySelector(CONFIG.SELECTORS.MANAGER_INFO_VALUE);
            
            if (!valueElement) return;

            if (label.includes('管理人姓名')) {
                document.getElementById('manager-name').value = valueElement.textContent || '';
            }
            else if (label.includes('管理人手机号')) {
                const phone = valueElement.textContent.replace(/[^\d]/g, '');
                document.getElementById('manager-phone').value = phone;
            }
        });

        const businessAddressSpan = document.querySelector('[data-field="business-address"] span');
        const smallBusinessSpan = document.querySelector('[data-field="small-business"] span');

        if (businessAddressSpan) {
            document.getElementById('business-address').value = businessAddressSpan.textContent || '';
        }
        if (smallBusinessSpan) {
            const checkbox = document.getElementById('small-business');
            if (checkbox) {
                checkbox.checked = smallBusinessSpan.textContent.trim() === '是';
            }
        }
    }

    // 添加获取表单值的函数
    function getFormValues() {
        return CONFIG.FIELDS.SHOP.reduce((acc, field) => {
            const element = document.getElementById(field.id);
            if (field.type === 'checkbox') {
                // 只有当复选框被选中时才添加值
                if (element?.checked) {
                    acc[field.id] = '是';
                }
                // 如果未选中，不添加该字段
            } else if (field.id === 'manager-phone' && element?.value) {
                // 处理手机号码，自动隐藏中间四位
                const phone = element.value.replace(/\s/g, '');
                if (phone.length === 11) {
                    acc[field.id] = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                } else {
                    acc[field.id] = phone;
                }
            } else {
                acc[field.id] = element?.value || '';
            }
            return acc;
        }, {});
    }

    // 启动应用
    const app = new ShopModifier();
    window.shopModifier = app; // 保存实例以供全局访问

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }
})();

