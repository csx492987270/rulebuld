// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs =  require('fs');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "rulebuild" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('rulebuild.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from RuleBuild!');
	});
	const webviewDir = path.join(context.extensionPath, 'views');
	let newHtml=vscode.commands.registerCommand('rulebuild.newHtml', () => {
	    const panel = vscode.window.createWebviewPanel(
			'testWebview', // viewType
			"RuleBulider", // 视图标题
			vscode.ViewColumn.One, // 显示在编辑器的哪个部位
			{
				enableScripts: true, // 启用JS，默认禁用
				retainContextWhenHidden: true // webview被隐藏时保持状态，避免被重置
			}
		);
		panel.webview.html = getWebViewContent(context, 'topology_es5.html'); //加载html文件资源
		panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
		

			  }
		 }, undefined, context.subscriptions);
	})
	context.subscriptions.push(newHtml);
	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
// vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
function getWebViewContent(context, templatePath) {
	const resourcePath = path.join(context.extensionPath, templatePath);
	const dirPath = path.dirname(resourcePath);
	let html = fs.readFileSync(resourcePath, 'utf-8');
	html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
	  return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
	});
	return html;
  }
module.exports = {
	activate,
	deactivate
}
