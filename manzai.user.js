// ==UserScript==
// @name         Bilibili History to GitHub Issue
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add select button to Bilibili history page, send selected titles to GitHub issue, and copy to clipboard
// @author       You
// @match        https://www.bilibili.com/account/history*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// utils

(function () {
  "use strict";

  let today = (function () {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    if (day < 10) {
      day = "0" + day;
    }

    if (month < 10) {
      month = `0${month}`;
    }

    let today = `${year}${month}${day}`;
    return today;
  })();

  function checkToken(githubToken) {
    if (!githubToken) {
      const newToken = prompt("请输入GitHub Token：");
      if (newToken) {
        // 将新 Token 存储在 localStorage 中
        localStorage.setItem("githubToken", newToken);
      } else {
        // 用户取消输入或未提供 Token，可以在这里采取其他处理方式
        console.error("GitHub Token未提供，脚本无法运行。");
        return;
      }
    }
  }
  function addPunchButton() {
    // 调整布局
    const searchBar = document.querySelector(".b-head-search");
    searchBar.style.right = "330px";
    const btns = document.querySelector(".history-btn");
    btns.style.width = "300px";

    // 添加按钮
    const punchBtn = btns.appendChild(document.createElement("a"));
    punchBtn.href = "#";
    punchBtn.className = "btn";
    punchBtn.innerHTML = "打卡";
    punchBtn.style.marginLeft = "20px";
    return punchBtn;
  }

  function addCheckbox() {
    document
      .querySelector(".history-list")
      .addEventListener("DOMNodeInserted", function (event) {
        const newItem = event.target;
        // 检查新增元素是否为.history-item
        if (newItem.classList && newItem.classList.contains("history-record")) {
          // 获取标题和链接
          const title = newItem.querySelector(".title").innerText;
          const link = `https:${newItem
            .querySelector(".title")
            .getAttribute("href")}`;
          // 创建复选框
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "history-delete";
          checkbox.style.right = "30px";
          checkbox.style.width = "16px";
          checkbox.style.height = "16px";
          checkbox.setAttribute("data-title", title);
          checkbox.setAttribute("data-link", link);
          // 将复选框添加到历史项目中
          let checkBoxParent = newItem.querySelector(".r-txt");
          checkBoxParent.appendChild(checkbox);
        }
      });
  }

  function addBtnHandler(btn) {
    btn.addEventListener("click", () => {
      const selectedItems = document.querySelectorAll(
        '.history-record input[type="checkbox"]:checked'
      );
      let content = `### ${today}\r\n\r\n`;
      let clipboardText = `#漫才打卡-${today}\n\n`;
      selectedItems.forEach((selectedItem,index) => {
        const title = selectedItem.getAttribute("data-title");
        const link = selectedItem.getAttribute("data-link");
        content += `- [x] [${title}](${link})\r\n`;
        clipboardText += `${index+1}. ${title}\n`;
      });
      GM_setClipboard(clipboardText);
      updateGitHubIssue(content);
    });
  }

  function updateGitHubIssue(content) {
    let githubToken = localStorage.getItem("githubToken");
    if (!githubToken) {
      alert("请先配置 GitHub Token");
      return;
    }

    // 使用Fetch API发送GET请求到GitHub API，获取原有的 GitHub Issue 内容
    fetch(
      "https://api.github.com/repos/xifan2333/pessoa-golden-house/issues/14",
      {
        method: "GET",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        // 假设选择第一个 issue，可以根据实际需求调整
        const issue = data;

        // 在现有内容中附加新的标题和链接
        const updatedBody = `${issue.body}\r\n\r\n${content}`;

        // 使用Fetch API发送PATCH请求到GitHub API，更新 GitHub Issue 内容
        fetch(
          `https://api.github.com/repos/xifan2333/pessoa-golden-house/issues/14`,
          {
            method: "PATCH",
            headers: {
              Authorization: `token ${githubToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              body: updatedBody,
            }),
          }
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Issue updated:", data.html_url);
            alert("打卡成功！");
          })
          .catch((error) => {
            console.error("Error updating issue:", error);
          });
      })
      .catch((error) => {
        console.error("Error getting issue content:", error);
      });
  }
  function main() {
    const githubToken = localStorage.getItem("githubToken");
    checkToken(githubToken);
    let btn = addPunchButton();
    addCheckbox();
    addBtnHandler(btn);
  }
  main();
})();
