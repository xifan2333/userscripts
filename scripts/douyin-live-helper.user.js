// ==UserScript==
// @name         抖音推流码获取工具
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  获取抖音直播推流信息并支持心跳保活
// @author       xifan
// @match        https://live.douyin.com/*
// @match        https://www.douyin.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @connect      douyin.com
// @connect      webcast.amemv.com
// @downloadURL  https://raw.githubusercontent.com/xifan2333/userscripts/main/scripts/douyin-live-helper.user.js
// @updateURL    https://raw.githubusercontent.com/xifan2333/userscripts/main/scripts/douyin-live-helper.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 添加简洁样式
    const style = document.createElement('style');
    style.textContent = `
        #douyin-live-helper {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
            font-size: 14px;
            line-height: 1.5;
        }
        #douyin-live-helper .input-field {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            margin-bottom: 8px;
            box-sizing: border-box;
        }
        #douyin-live-helper .btn {
            padding: 6px 12px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-right: 6px;
            margin-bottom: 6px;
        }
        #douyin-live-helper .btn:hover {
            background: #40a9ff;
        }
        #douyin-live-helper .btn.success {
            background: #52c41a;
        }
        #douyin-live-helper .result-box {
            background: #f5f5f5;
            border: 1px solid #d9d9d9;
            border-radius: 3px;
            padding: 6px;
            margin: 6px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 11px;
            max-height: 60px;
            overflow-y: auto;
        }
        #douyin-live-helper .copy-btn {
            padding: 3px 8px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            margin-left: 6px;
            flex-shrink: 0;
        }
        #douyin-live-helper .copy-btn:hover {
            background: #40a9ff;
        }
        #douyin-live-helper .error {
            color: #ff4d4f;
            background: #fff2f0;
            border: 1px solid #ffccc7;
            padding: 6px;
            border-radius: 3px;
            font-size: 12px;
        }
        #douyin-live-helper .success {
            color: #52c41a;
            background: #f6ffed;
            border: 1px solid #b7eb8f;
            padding: 6px;
            border-radius: 3px;
            font-size: 12px;
        }
        #douyin-live-helper .warning {
            color: #fa8c16;
            background: #fff7e6;
            border: 1px solid #ffd591;
            padding: 8px;
            border-radius: 3px;
            font-size: 12px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);

    // 全局变量存储设备ID
    let userDeviceId = GM_getValue('douyin_device_id', '');
    let isPanelExpanded = GM_getValue('panel_expanded', true);

    // 心跳相关变量
    let heartbeatInterval = null;
    let isHeartbeatActive = false;
    let heartbeatCount = 0;
    let currentRoomId = '';
    let currentStreamId = '';

    // 获取设备ID和aid参数
    function getDeviceParams() {
        const aid = 1128; // 默认使用1128
        return { deviceId: userDeviceId, aid };
    }

    // 设置设备ID
    function setDeviceId(deviceId) {
        userDeviceId = deviceId;
        GM_setValue('douyin_device_id', deviceId);
    }

    // 发送心跳包 (萧条包)
    function sendHeartbeat(roomId, streamId, status = 2) {
        return new Promise((resolve) => {
            const { aid } = getDeviceParams();
            const url = `https://webcast.amemv.com/webcast/room/ping/anchor/?room_id=${roomId}&status=${status}&stream_id=${streamId}&reason_no=0&aid=${aid}`;

            GM_cookie("list", { url: "https://www.douyin.com" }, (cookieList, error) => {
                if (error) {
                    console.error('获取cookies失败:', error);
                    resolve({ success: false, error: '获取cookies失败', fatal: false });
                    return;
                }

                const cookies = cookieList.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'User-Agent': navigator.userAgent,
                        'Referer': 'https://live.douyin.com/',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Cookie': cookies
                    },
                    onload: function(response) {
                        try {
                            if (response.status !== 200) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            const data = JSON.parse(response.responseText);
                            console.log('心跳响应:', data);

                            if (data.status_code === 0) {
                                resolve({ success: true, data: data });
                            } else if (data.status_code === 30003) {
                                // 直播已结束
                                const message = data.data?.prompts || data.data?.message || '直播已结束';
                                resolve({
                                    success: false,
                                    error: `${message} (${data.status_code})`,
                                    fatal: true,
                                    statusCode: data.status_code,
                                    message: message
                                });
                            } else {
                                resolve({
                                    success: false,
                                    error: `心跳失败: ${data.status_code}`,
                                    fatal: false,
                                    statusCode: data.status_code
                                });
                            }
                        } catch (error) {
                            console.error('解析心跳响应失败:', error);
                            resolve({ success: false, error: error.message, fatal: false });
                        }
                    },
                    onerror: function(error) {
                        console.error('心跳请求失败:', error);
                        resolve({ success: false, error: '心跳网络请求失败', fatal: false });
                    }
                });
            });
        });
    }

    // 启动心跳
    function startHeartbeat(roomId, streamId) {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }

        currentRoomId = roomId;
        currentStreamId = streamId;
        isHeartbeatActive = true;
        heartbeatCount = 0;

        console.log('启动心跳保活, 房间ID:', roomId, '推流ID:', streamId);

        // 立即发送一次心跳
        sendHeartbeat(roomId, streamId).then(result => {
            if (result.success) {
                heartbeatCount++;
                updateHeartbeatStatus();
            }
        });

        // 每20秒发送一次心跳（与原程序保持一致，0x4e20 = 20000ms）
        heartbeatInterval = setInterval(async () => {
            const result = await sendHeartbeat(roomId, streamId);
            if (result.success) {
                heartbeatCount++;
                updateHeartbeatStatus();
                console.log(`心跳发送成功 #${heartbeatCount}`);
            } else {
                console.error('心跳发送失败:', result.error);

                // 检查是否为致命错误（如直播已结束）
                if (result.fatal) {
                    console.log('检测到致命错误，停止心跳保活');
                    stopHeartbeat();

                    // 发送桌面通知
                    if (typeof GM_notification !== 'undefined') {
                        GM_notification({
                            title: '抖音直播助手',
                            text: result.message || '直播已结束，心跳保活已停止',
                            timeout: 5000
                        });
                    } else if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('抖音直播助手', {
                            body: result.message || '直播已结束，心跳保活已停止',
                            icon: 'https://www.douyin.com/favicon.ico'
                        });
                    }

                    // 更新UI显示
                    updateHeartbeatStatus(result.error, true);

                    // 隐藏停止按钮
                    const stopBtn = document.getElementById('stopHeartbeatBtn');
                    if (stopBtn) {
                        stopBtn.style.display = 'none';
                    }
                } else {
                    updateHeartbeatStatus(result.error);
                }
            }
        }, 20000);
    }

    // 停止心跳
    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        // 发送停止状态的心跳
        if (currentRoomId && currentStreamId) {
            sendHeartbeat(currentRoomId, currentStreamId, 4).then(result => {
                console.log('发送停止心跳:', result);
            });
        }

        isHeartbeatActive = false;
        heartbeatCount = 0;
        currentRoomId = '';
        currentStreamId = '';

        console.log('心跳保活已停止');
        updateHeartbeatStatus();
    }

    // 更新心跳状态显示
    function updateHeartbeatStatus(errorMsg = '', isFatal = false) {
        const statusDiv = document.getElementById('heartbeatStatus');
        if (!statusDiv) return;

        if (errorMsg) {
            statusDiv.innerHTML = `<div class="error">${errorMsg}</div>`;
        } else if (isHeartbeatActive) {
            statusDiv.innerHTML = `<div class="success">心跳保活运行中 (已发送 ${heartbeatCount} 次)</div>`;
        } else {
            statusDiv.innerHTML = '';
        }
    }

    // 获取推流信息
    function getStreamInfo() {
        return new Promise((resolve) => {
            const { deviceId, aid } = getDeviceParams();

            // 检查是否已设置设备ID
            if (!deviceId) {
                resolve({
                    success: false,
                    error: '请先设置设备ID'
                });
                return;
            }

            const url = `https://webcast.amemv.com/webcast/room/continue/?device_id=${deviceId}&aid=${aid}`;

            // 使用回调形式获取抖音域名的cookies
            GM_cookie("list", { url: "https://www.douyin.com" }, (cookieList, error) => {
                if (error) {
                    console.error('获取cookies失败:', error);
                    resolve({
                        success: false,
                        error: '获取cookies失败'
                    });
                    return;
                }

                const cookies = cookieList.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
                console.log('获取到的cookies数量:', cookieList.length);

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'User-Agent': navigator.userAgent,
                        'Referer': 'https://live.douyin.com/',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Cookie': cookies
                    },
                    onload: function(response) {
                        try {
                            if (response.status !== 200) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            const data = JSON.parse(response.responseText);

                            if (data.status_code === 0) {
                                console.log('推流信息获取成功:', data);

                                // 根据实际API响应结构解析
                                const streamData = data.data || {};
                                const streamUrl = streamData.stream_url || {};
                                const rtmpPushUrl = streamUrl.rtmp_push_url || '';

                                // 解析推流服务器地址和推流码
                                let serverAddress = '';
                                let streamCode = '';

                                if (rtmpPushUrl) {
                                    // 分割URL和参数
                                    const [baseUrl, params] = rtmpPushUrl.includes('?')
                                        ? rtmpPushUrl.split('?', 2)
                                        : [rtmpPushUrl, ''];

                                    // 提取服务器地址 (rtmp://server/app)
                                    const urlParts = baseUrl.split('/');
                                    if (urlParts.length >= 4) {
                                        serverAddress = `${urlParts[0]}//${urlParts[2]}/${urlParts[3]}`;
                                        const streamKeyBase = urlParts[4] || '';

                                        // 组合推流码 (stream-id?params)
                                        streamCode = params ? `${streamKeyBase}?${params}` : streamKeyBase;
                                    }

                                    console.log('推流服务器地址:', serverAddress);
                                    console.log('推流码:', streamCode);
                                }

                                resolve({
                                    success: true,
                                    // 原始数据 - 根据实际响应结构
                                    streamUrl: streamUrl,
                                    rtmpPushUrl: rtmpPushUrl,
                                    streamId: streamData.stream_id_str || streamUrl.id_str || '',
                                    roomId: streamData.id_str || '',
                                    nickname: streamData.owner?.nickname || '未知用户',
                                    // 解析后的数据
                                    serverAddress: serverAddress,
                                    streamCode: streamCode,
                                    // 其他有用信息
                                    title: streamData.title || '',
                                    status: streamData.status || 0,
                                    // 调试信息
                                    rawData: data
                                });
                            } else {
                                console.error('API返回错误:', data);
                                resolve({
                                    success: false,
                                    error: `API错误: ${data.status_code}`,
                                    message: data.message || '未知错误'
                                });
                            }
                        } catch (error) {
                            console.error('解析响应失败:', error);
                            resolve({
                                success: false,
                                error: error.message
                            });
                        }
                    },
                    onerror: function(error) {
                        console.error('请求失败:', error);
                        resolve({
                            success: false,
                            error: '网络请求失败'
                        });
                    }
                });
            });
        });
    }


    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'douyin-live-helper';

        function updatePanelStyle() {
            if (isPanelExpanded) {
                panel.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    width: 480px;
                    max-height: 90vh;
                    overflow-y: auto;
                    z-index: 99999;
                    background: #fff;
                    border: 1px solid #d9d9d9;
                    border-radius: 6px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
            } else {
                panel.style.cssText = `
                    position: fixed;
                    top: 0px;
                    left: 0px;
                    width: auto;
                    z-index: 99999;
                    background: #fff;
                    border: 1px solid #d9d9d9;
                    border-radius: 6px;
                    padding: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
            }
        }

        function updatePanelContent() {
            if (isPanelExpanded) {
                panel.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #262626; font-size: 15px; font-weight: 600;">抖音直播助手</h3>
                        <button type="button" id="toggleBtn" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #595959; padding: 0;">−</button>
                    </div>

                    <div style="margin-bottom: 8px;">
                        <label style="display: block; margin-bottom: 3px; color: #595959; font-size: 12px;">设备ID:</label>
                        <input type="text" id="deviceIdInput" class="input-field" placeholder="输入设备ID" value="${userDeviceId}">
                    </div>

                    <div class="warning" style="margin-bottom: 8px;">
                        <strong>重要：</strong>保持页面打开，建议在 <a href="https://www.douyin.com/user/self" target="_blank" style="color: #fa8c16; text-decoration: underline;">个人主页</a> 等轻量级页面运行
                    </div>

                    <div style="margin-bottom: 8px;">
                        <button type="button" class="btn" id="setDeviceBtn">设置ID</button>
                        <button type="button" class="btn" id="getStreamBtn">获取推流(保活)</button>
                        <button type="button" class="btn" id="stopHeartbeatBtn" style="background: #ff4d4f; display: none;">停止</button>
                    </div>

                    <div id="heartbeatStatus" style="margin-top: 6px;"></div>
                    <div id="streamInfo" style="margin-top: 10px;"></div>
                `;
            } else {
                panel.innerHTML = `
                    <button type="button" id="toggleBtn" style="background: #1890ff; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 14px;">直播助手</button>
                `;
            }
        }

        updatePanelStyle();
        updatePanelContent();

        document.body.appendChild(panel);

        let currentStreamInfo = null;

        // 切换按钮事件
        function bindToggleEvent() {
            const toggleBtn = document.getElementById('toggleBtn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    isPanelExpanded = !isPanelExpanded;
                    GM_setValue('panel_expanded', isPanelExpanded);
                    updatePanelStyle();
                    updatePanelContent();
                    bindEvents();
                });
            }
        }

        // 绑定所有事件
        function bindEvents() {
            bindToggleEvent();

            // 设置设备ID按钮事件
            const setDeviceBtn = document.getElementById('setDeviceBtn');
            if (setDeviceBtn) {
                setDeviceBtn.addEventListener('click', () => {
                    const deviceIdInput = document.getElementById('deviceIdInput');
                    const deviceId = deviceIdInput.value.trim();

                    if (deviceId) {
                        setDeviceId(deviceId);
                        const infoDiv = document.getElementById('streamInfo');
                        infoDiv.innerHTML = '<div class="success">设备ID已保存</div>';
                        setTimeout(() => {
                            infoDiv.innerHTML = '';
                        }, 2000);
                    } else {
                        alert('请输入有效的设备ID');
                    }
                });
            }

            // 停止心跳按钮事件
            const stopHeartbeatBtn = document.getElementById('stopHeartbeatBtn');
            if (stopHeartbeatBtn) {
                stopHeartbeatBtn.addEventListener('click', () => {
                    stopHeartbeat();
                    stopHeartbeatBtn.style.display = 'none';
                    const infoDiv = document.getElementById('streamInfo');
                    if (infoDiv) {
                        const successDiv = infoDiv.querySelector('.success');
                        if (successDiv) {
                            successDiv.innerHTML = '<strong>心跳保活已停止</strong>';
                        }
                    }
                });
            }

            // 获取推流信息按钮事件
            const getStreamBtn = document.getElementById('getStreamBtn');
            if (getStreamBtn) {
                getStreamBtn.addEventListener('click', async () => {
                    const infoDiv = document.getElementById('streamInfo');

                    infoDiv.innerHTML = '<div style="color: #1890ff;">正在获取推流信息...</div>';

                    const result = await getStreamInfo();

                    if (result.success) {
                        currentStreamInfo = result;

                        // 自动启动心跳保活
                        if (result.roomId && result.streamId) {
                            startHeartbeat(result.roomId, result.streamId);
                            const stopBtn = document.getElementById('stopHeartbeatBtn');
                            if (stopBtn) {
                                stopBtn.style.display = 'inline-block';
                            }
                        }

                        infoDiv.innerHTML = `
                            <div class="success" style="margin-bottom: 8px;">
                                <strong>获取成功 - 心跳已启动</strong>
                            </div>

                            <div style="margin-bottom: 6px; font-size: 12px;">
                                <strong>用户:</strong> ${result.nickname || 'N/A'} | <strong>直播间:</strong> ${result.title || 'N/A'}
                            </div>

                            ${result.serverAddress ? `
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-weight: 500; font-size: 12px;">推流服务器:</label>
                                <div style="display: flex; align-items: flex-start;">
                                    <div class="result-box" style="flex: 1; margin-right: 6px; margin-bottom: 0;">${result.serverAddress}</div>
                                    <button type="button" class="copy-btn" id="copyServerBtn">复制</button>
                                </div>
                            </div>
                            ` : ''}

                            ${result.streamCode ? `
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-weight: 500; font-size: 12px;">推流码:</label>
                                <div style="display: flex; align-items: flex-start;">
                                    <div class="result-box" style="flex: 1; margin-right: 6px; margin-bottom: 0;">${result.streamCode}</div>
                                    <button type="button" class="copy-btn" id="copyCodeBtn">复制</button>
                                </div>
                            </div>
                            ` : ''}
                        `;

                        // 为动态创建的复制按钮绑定事件
                        setTimeout(() => {
                            const copyServerBtn = document.getElementById('copyServerBtn');
                            const copyCodeBtn = document.getElementById('copyCodeBtn');

                            if (copyServerBtn) {
                                copyServerBtn.addEventListener('click', () => {
                                    if (currentStreamInfo && currentStreamInfo.serverAddress) {
                                        navigator.clipboard.writeText(currentStreamInfo.serverAddress).then(() => {
                                            const originalText = copyServerBtn.textContent;
                                            copyServerBtn.textContent = '已复制';
                                            copyServerBtn.className = 'copy-btn success';

                                            setTimeout(() => {
                                                copyServerBtn.textContent = originalText;
                                                copyServerBtn.className = 'copy-btn';
                                            }, 2000);
                                        }).catch(err => {
                                            console.error('复制失败:', err);
                                            alert('复制失败，请手动复制');
                                        });
                                    }
                                });
                            }

                            if (copyCodeBtn) {
                                copyCodeBtn.addEventListener('click', () => {
                                    if (currentStreamInfo && currentStreamInfo.streamCode) {
                                        navigator.clipboard.writeText(currentStreamInfo.streamCode).then(() => {
                                            const originalText = copyCodeBtn.textContent;
                                            copyCodeBtn.textContent = '已复制';
                                            copyCodeBtn.className = 'copy-btn success';

                                            setTimeout(() => {
                                                copyCodeBtn.textContent = originalText;
                                                copyCodeBtn.className = 'copy-btn';
                                            }, 2000);
                                        }).catch(err => {
                                            console.error('复制失败:', err);
                                            alert('复制失败，请手动复制');
                                        });
                                    }
                                });
                            }
                        }, 100);
                    } else {
                        infoDiv.innerHTML = `
                            <div class="error">
                                <strong>获取失败</strong><br>
                                ${result.error}
                                ${result.message ? `<br>${result.message}` : ''}
                            </div>
                        `;
                    }
                });
            }
        }

        // 初始化事件绑定
        bindEvents();

    }

    // 等待页面加载完成后创建控制面板
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createControlPanel);
    } else {
        createControlPanel();
    }
})();