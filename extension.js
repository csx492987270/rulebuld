// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs =  require('fs');
const {isWindows} =  require('./plugins/topology/os');
let ruleList = {}; //fms 数据
let fileUrl = "" //.rule 文件路径
let ruleJsonUrl= "" //fsm 路径url
let dataListUrl="" //urul路径
let timer = null   //时间变量
let dataListJson=[]  //urule数据
let fnsList = []  //函数集
let extensionPath ='' //当前文件路径
let tableMiUrl = ''  //vtable.mi 路径
let tableMiName = '' //vtable.mi名字
let jarUrl = '' //jar 路径
let jarName ='' //jar名字
let sys = ''  //判断系统
let arrlistUrl = [] //c的数据
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
	sys = isWindows()
	if(context.extensionPath){
		extensionPath = context.extensionPath
	}	
	if(vscode.workspace.workspaceFolders[0].uri.path){
		fileUrl =vscode.workspace.workspaceFolders[0].uri.path;
		fileUrl= `${fileUrl}/.rule`;
		if(!sys){
		}else {
			 fileUrl = fileUrl.replace('/','');
		}
		ruleJsonUrl= `${fileUrl}/fsm.json`
		dataListUrl= `${fileUrl}/dataList.json`
	}
	createFile()
    getRules()
	getDataList()	
	getJarUrl()
	// console.log(vscode.languages.getLanguages())
	let disposable = vscode.commands.registerCommand('rulebuild.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from RuleBuild!');
	});
	const webviewDir = path.join(context.extensionPath, 'views');
	let newHtml=vscode.commands.registerCommand('rulebuild.newHtml-java', () => {
		createFile()
		getRules()
		getDataList()	
		getJarUrl()
		tableMiUrl=''
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
		setTimeout(() => {
			panel.webview.postMessage({ruleList:ruleList,type:'ruleList',dataList:dataListJson,jarUrl:jarUrl,tableMiUrl:tableMiUrl}); //传送历史rules数据	
		}, 1000);
		fnList(panel) //函数列
		panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case "createFs":
					    let XVSA= process.env.XVSA_HOME || ''
						let terminalA = vscode.window.createTerminal({ name: "createFn" });
						terminalA.show(true);
						let cmds = "";
						if(!!sys){
						   terminalA.sendText('cmd'); //输入命令
						   cmds = `mvn io.xc5:xvsa-maven-plugin:1.39:gather -Dxvsa.dir="${extensionPath}\\xvsa" -Dxvsa.phantom=true -X -Djfe.opt="-v,-dumpMethodName=true,-win32=true,-libGen=true,-libGenOnly=true" -Dxvsa.lib.gen=true`
						}else {
						   cmds = `mvn io.xc5:xvsa-maven-plugin:1.39:gather -Dxvsa.dir=${XVSA} -Dxvsa.phantom=true -X -Djfe.opt="-v,-dumpMethodName=true,-libGenOnly=true,-VTABLE=true" -Dxvsa.lib.gen=true`
						}
						terminalA.sendText(cmds); //输入命令
						clearInterval(timer)
						fnsList = []
						timer =setInterval(function(){ 
							console.log(fnsList.length)
							if(fnsList.length){
								clearInterval(timer)
							}else {	
								fnList(panel)
							}	
						 }, 3000);					
						break;
						  case 'edit':	
							editRule(message,panel) 
							  break;
						  case 'del':	
							delRule(message,panel,'java')
						   break;
						   case 'delURule':	
						   delURule(message,panel)
						  break;	
						  case 'addUrule':		 
						   if(!message.name){
								vscode.window.showErrorMessage('请输入ruleName');
								panel.webview.postMessage({type:'addUrule',status:'none'})
							  return
							}else {	
								let obj={}
								obj.name = message.name
								obj.remark = message.remark
								obj.id =message.id?message.id:new Date().getTime()
								let type = message.id?'edit':'add'
								createDataJson(obj,panel,type)
						   }	 	  			  
							break;
						  case 'save':	
						  if(!message.name){
							vscode.window.showErrorMessage('请输入fsmName');
							return
						  }else {	
							saveRule(message,panel)	 
						  }	
							 break;
						  case 'shell':	
							toShell(message,'java')
							break;	
							case 'test':		
						//	let testObj = message	
							break;	

			  }
		 }, undefined, context.subscriptions);
	})
	let newHtmlC=vscode.commands.registerCommand('rulebuild.newHtml-c', () => {
		const panel = vscode.window.createWebviewPanel(
			'testWebview', // viewType
			"RuleBulider", // 视图标题
			vscode.ViewColumn.One, // 显示在编辑器的哪个部位
			{
				enableScripts: true, // 启用JS，默认禁用
				retainContextWhenHidden: true // webview被隐藏时保持状态，避免被重置
			}
		);
	    createFile()
        getRules()
	    getDataList()	
	    let cfnList = getfnc()
		panel.webview.html =  getWebViewContent(context, 'topology_es5_c.html'); //加载html文件资源
		setTimeout(() => {
		 panel.webview.postMessage({ruleList:ruleList,type:'ruleList',dataList:dataListJson,cfnList:cfnList}); 
		},500)
		panel.webview.onDidReceiveMessage(async (message)=> {
			switch (message.command) {
				case "createFs":
					let arr = [];
					let miurl = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.path : '';
					if(!sys){
					}else {
						 miurl = miurl.replace('/','')
					}
					let arrlist = await	getAll('',miurl);
					for (let fileUrl of arrlistUrl) {
						await vscode.window.showTextDocument(vscode.Uri.file(fileUrl));
						var activeEditor = vscode.window.activeTextEditor;
						let iiurl = activeEditor?activeEditor.document.uri:''
						let symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', iiurl )
						if (symbols !== undefined && symbols.length) {
							for (let item of symbols){
								if (item.kind == 11) {
									let str = item.name
									arr.push(str)
								}
							}
							 // console.log(arr)
						   }
					  }
					createCfnJson(arr)
					panel.webview.postMessage({fnlist:arr,type:'createFn'});
					break;
					case 'addUrule':		 
					if(!message.name){
						 vscode.window.showErrorMessage('请输入ruleName');
						 panel.webview.postMessage({type:'addUrule',status:'none'})
					   return
					 }else {	
						 let obj={}
						 obj.name = message.name
						 obj.remark = message.remark
						 obj.id =message.id?message.id:new Date().getTime()
						 let type = message.id?'edit':'add'
						 createDataJson(obj,panel,type)
					}	 	  			  
					 break;
					 case 'del':	
					   delRule(message,panel,'c')
					  break;
					 case 'delURule':
						delURule(message,panel)
						break;
					case 'save':	
						if(!message.name){
						  vscode.window.showErrorMessage('请输入fsmName');
						  return
						}else {	
						  saveRuleC(message,panel)	 
						}	
						 break;
						 case 'edit':	
						 editRule(message,panel) 
						   break;
						case 'shell':	
						 toShell(message,'c')
						 break;    

			  }
		 }, undefined, context.subscriptions);
	})
	context.subscriptions.push(newHtml);
	context.subscriptions.push(newHtmlC);
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
//生的mi文件
function fliter(obj){
	let str = ''
	let DEF_ACTION = ''
	let DECLARE = ''
	let allArr = obj.pens || []
	let nodeList = allArr.filter(item=>item.type==0) || []
	let lines =  allArr.filter(item=>item.type==1) || []
	nodeList.forEach(item => {
		str += `NODE|${item.text}\n`
	});
	lines.forEach(item=>{
		let txt = item.text
		let arr=txt.includes("|")?txt.split("|"):[]
		let from = allArr.filter(it=>item.from.id==it.id)
		let to =  allArr.filter(it=>item.to.id==it.id)
		if(arr.length){
			  let remarkArr= dataListJson.filter(it=>it.name==arr[1])
			   DECLARE += `DECLARE|${arr[1]}|CUSTOM|${remarkArr.length?remarkArr[0].remark:''}\n`
			if(arr.length && arr[0] !="" &&  arr[0] !=''){
				str += `EDGE|${from[0]['text']}|${to[0]['text']}|${arr[0]}|none|this()|${arr.length?arr[1]:'none'}\n`
			}else {
			   DEF_ACTION += `DEF_ACTION|${from[0]['text']}|${arr[1]}\n`
			}
		}else {
			str += `EDGE|${from[0]['text']}|${to[0]['text']}|${item.text}|none|this()|none\n`
		}	
	})
	return `${str}${DEF_ACTION}${DECLARE}`
}
//保存rule
function saveRule(message,panel){
	let obj = {}
	switch(message.type){
		case 'del':
		  obj= message.text
		  let url = `${fileUrl}/${message.name}.mi`  
          deleteFolderRecursive(url)
		   fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
				if (err) {res.status(500).send('Server is error...')}
			 })
			break;
		case 'add':
			let fsmJson=message.text
		    // fsmJson =  getRemark(fsmJson);
			createMi(fsmJson ,  message) //创建规则mi
			let miFileUrl =`${fileUrl}/${message.name}.mi`  
			fs.readFile(ruleJsonUrl,'utf-8',(err,data)=>{			
				if(data){
					let newData = JSON.parse(data)  
					obj = newData;
					obj[message.name]=fsmJson
					fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
					  if (err) {res.status(500).send('Server is error...')}
					})
				}else if(err && err.code=='ENOENT' ) {
					obj[message.name] = fsmJson 
					fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
						  if (err) {res.status(500).send('Server is error...')}
					 })
				}	
				panel.webview.postMessage({ruleList:obj,type:'ruleList',miFileUrl:miFileUrl,jarUrl:jarUrl,tableMiUrl:tableMiUrl});
			})
			break;
		default:
			break;	

	}

}
//创建。rule文件夹
function createFile(){
	let  checkDir = fs.existsSync(fileUrl);
	if(checkDir) {
		return
	}
	fs.mkdir(fileUrl, "0777", function(err){
		  if(err){
			  console.log(err);
		  }else{
			console.log("creat done!");
		  }

	})
}
//删除文件
 function deleteFolderRecursive(url) {
	fs.unlink(url,function (err) {
		if (err){
			res.send("删除失败");
			return;
		}
	});
}
//获取历史rules数据
function getRules(){ 

 let  checkDir = fs.existsSync(ruleJsonUrl);	 
    if(checkDir){
	let  data = fs.readFileSync(ruleJsonUrl,'utf-8');
	 ruleList = JSON.parse(data) 
    }else {
	  ruleList={}
  }
}
//获取dataList数据
function getDataList(){ 
	let  checkDir = fs.existsSync(dataListUrl);	 
    if(checkDir){
   	  let  data = fs.readFileSync(dataListUrl,'utf-8');
	   dataListJson = JSON.parse(data) 
     }else {
		dataListJsont=[]
	 }
 }
//编辑rule数据
function editRule(message,panel){
	let miFileUrl = `${fileUrl}/${message.name}.mi`  
	fs.readFile(ruleJsonUrl,'utf-8',(err,data)=>{
		if(data){
			let newData = JSON.parse(data) 
			let fsmcurrent = newData[message.name]
			panel.webview.postMessage({fsmcurrent:fsmcurrent,type:'refresh',miFileUrl:miFileUrl});
		}
	})
}
//删除rule 数据
function delRule(message,panel,type){
 	fs.readFile(ruleJsonUrl,'utf-8',(err,data)=>{
 		if(data){
 			let newData = JSON.parse(data) 
			delete newData[message.name]
			let miFileUrl = `${fileUrl}/${message.name}.mi`  
 			panel.webview.postMessage({ruleList:newData,type:'del',miFileUrl:miFileUrl,name:message.name});
 			message.text = newData
			 if(type=='java'){
				saveRule(message,panel)
			 }else {
				saveRuleC(message,panel)
			 }
 		}
 	})
}

//mi生成函数lie
function fnList(panel){	
	let url = vscode.workspace.workspaceFolders[0].uri.path
	let miurl= `${url}/target/xvsa-out`
	if(!sys){
	}else {
		 miurl = miurl.replace('/','')
	}
     let  checkDir = fs.existsSync(miurl);
     if (checkDir){
	 let files = fs.readdirSync( miurl );
	 let dfv = files.filter(item=>item.includes('vtable.mi'))
	 if(dfv.length){
		 let miName = dfv[0]
		 tableMiName = miName
		 let newUl = `${miurl}/${miName}`
		 tableMiUrl = newUl //赋值
		 fs.readFile(newUl,'utf-8',(err,data)=>{
			if(data){		

				let	miFlie = data.split("\n") 
				fnsList = miFlie
				//packageGet(fnsList)
				 setTimeout(()=>{
					panel.webview.postMessage({text:miFlie,type:'fnList',tableMiUrl:tableMiUrl});
				 },1000)
			}
		})
	 }
   } 
}
//生成规则mi
function createMi(fsmJson,message){
	let urls= `${fileUrl}/${message.name}.mi`  
	let jsdata=fliter(fsmJson)
	fs.writeFile(urls,jsdata,function(err){     
	  if (err) {res.status(500).send('Server is error...')}
	}) 
}
//urule 数据
function createDataJson(obj,panel,type){
	let dataArr= []
	fs.readFile(dataListUrl,'utf-8',(err,data)=>{			
		if(data){
			let newData = JSON.parse(data)  
			if(type=='add'){
			  dataArr=[...newData,obj]
			}else {
				let currentIdIndex = newData.findIndex(item => item.id == obj.id);
				newData.splice(currentIdIndex,1,obj)
				dataArr=[...newData]
			}
			fs.writeFile(dataListUrl,JSON.stringify(dataArr,"","\t"),'utf-8',(err,data)=>{
			  if (err) {res.status(500).send('Server is error...')}
			})
		}else if(err && err.code=='ENOENT' ) {
			dataArr.push(obj)
			fs.writeFile(dataListUrl,JSON.stringify(dataArr,"","\t"),'utf-8',(err,data)=>{
				if (err) {res.status(500).send('Server is error...')}
			  })
		}
		dataListJson = dataArr
		panel.webview.postMessage({type:'addUrule',status:'yes',dataList:dataArr})
	})
}
//获取remark数据
function getRemark(fsmJson){
	  let links= [];
	  fsmJson.links.forEach(item=>{
	  let blean = item.text.includes("|")
		  if(blean){
			  let arr = item.text.split("|")
			  let remarkName= arr[arr.length-1];
			  let remark = ''
			  dataListJson.forEach((it)=>{
				if(it.name==remarkName){
					item.remark = it.remark
				}
			  })
		  }
		  return item
	  })
	 return fsmJson
}
//删除delURule
function delURule(message,panel){
	switch(message.type){
		case "del":
		   dataListJson = dataListJson.filter(item => item.id!=message.id)	
		   fs.writeFile(dataListUrl,JSON.stringify(dataListJson,"","\t"),'utf-8',(err,data)=>{
		 	 if (err) {res.status(500).send('Server is error...')}
	       })
	    	panel.webview.postMessage({type:'addUrule',status:'no',dataList:dataListJson})
			break;
	}
}
//获取jar 包路径
function getJarUrl(){
	let url = vscode.workspace.workspaceFolders[0].uri.path
	let miurl= `${url}/target`
	if(!sys){
	}else {
		 miurl = miurl.replace('/','')
	}
	let  checkDir = fs.existsSync(miurl)
	if(checkDir){
		let files = fs.readdirSync( miurl );
		let urlArr = files.filter(item=>item.includes('.jar'))
		if(urlArr.length){
			jarName = urlArr[0]
			jarUrl = `${miurl}/${urlArr[0]}`
		}else {
			jarName = ''
			jarUrl = ''
		}
	}
}
//执行shell
function toShell(message,type){
	let terminalB = vscode.window.createTerminal({ name: "createFn" });
	let str = message.name
	terminalB.show(true);
	let  serverIp= vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.serverIp');
	let  serverUseName = vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.serverUseName');
	let  serverPasswd= vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.serverPasswd');
	let  newFileUrl= vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.fileUrl');
	let  databasePort=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.databasePort');
	let  databaseUser=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.databaseUser');
	let  databasePassword=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.databasePassword');
	let  mainpyUrl=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.mainpyUrl');
	let  tarGetUrl=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.tarGetUrl');
	let  XVSA_PATH=vscode.workspace.getConfiguration().get('rulebuild.exceptions.file.extensions.xvsaUrl');
	let  newfile = `${fileUrl}/${message.name}.mi`  
	let  fileNames = `${newFileUrl}/${message.name}.mi`
	let  tableMi =  `${newFileUrl}/${tableMiName}`
	let  jarflie = `${newFileUrl}/${jarName}`
	let  configFlie = `${newFileUrl}/config.ini`
	let  rules = []
	dataListJson.forEach(item=>{
		rules.push({rulecode:item.name,"ruleset": "CUSTOM", "description": item.remark, "name":  item.remark})
	})
	let strConfig = `[config]\nname = "${message.name}"\nlang = "${type}"\nxvsa_path="${XVSA_PATH}"\ninput = "${fileNames}"\nreferences = "${tableMi}"\ndependency = "${jarflie}"\nhost = "${serverIp}"\nuser = "${databaseUser}"\nport = "${databasePort}"\npassword="${databasePassword}"\nrules=${JSON.stringify(rules)}\ntarget = "${tarGetUrl}"`
	let confUrl = `${fileUrl}/config.ini`
	fs.writeFile(confUrl,strConfig,'utf-8',(err,data)=>{
		if (err) {res.status(500).send('Server is error...')}
	})
	let filLis = [tableMiUrl,jarUrl,newfile,confUrl]
	let fileNameArr = [tableMi,jarflie,fileNames,configFlie ]
	let pytest = ''

	if(!sys){
		pytest =`${extensionPath}/test.py`
	}else {
		pytest =`${extensionPath}\\test.py`
	}
	terminalB.sendText('cmd'); //输入命令
	terminalB.sendText(`python ${pytest} ${serverUseName} ${serverPasswd} ${serverIp} ${filLis} ${fileNameArr} ${mainpyUrl} ${tarGetUrl} ${newFileUrl}`)
}
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */

/**   ------------------------------------  c function ----------------------------------------------------------------------------- */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
/****************************************************************** */
function saveRuleC(message,panel){
	let obj = {}
	switch(message.type){
		case 'del':
		  obj= message.text
		  let url = `${fileUrl}/${message.name}.mi`  
          deleteFolderRecursive(url)
		   fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
				if (err) {res.status(500).send('Server is error...')}
			 })
			break;
		case 'add':
			let fsmJson=message.text
		    // fsmJson =  getRemark(fsmJson);
			createMiC(fsmJson ,  message) //创建规则mi
			let miFileUrl =`${fileUrl}/${message.name}.mi`  
			fs.readFile(ruleJsonUrl,'utf-8',(err,data)=>{			
				if(data){
					let newData = JSON.parse(data)  
					obj = newData;
					obj[message.name]=fsmJson
					fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
					  if (err) {res.status(500).send('Server is error...')}
					})
				}else if(err && err.code=='ENOENT' ) {
					obj[message.name] = fsmJson 
					fs.writeFile(ruleJsonUrl,JSON.stringify(obj,"","\t"),'utf-8',(err,data)=>{
						  if (err) {res.status(500).send('Server is error...')}
					 })
				}	
				panel.webview.postMessage({ruleList:obj,type:'ruleList',miFileUrl:miFileUrl});
			})
			break;
		default:
			break;	

  } 
}
//urule 数据
function createCfnJson(arr){
	let cFunctionUrl= `${fileUrl}/cFunction.json`
	fs.writeFile(cFunctionUrl,JSON.stringify(arr,"","\t"),'utf-8',(err,data)=>{
		if (err) {res.status(500).send('Server is error...')}
	})
}
//生成规则c mi
function createMiC(fsmJson,message){
	let urls= `${fileUrl}/${message.name}.mi`  
	let jsdata=fliterC(fsmJson)
	fs.writeFile(urls,jsdata,function(err){     
	  if (err) {res.status(500).send('Server is error...')}
	}) 
}
//生的c mi文件
function fliterC(obj){
	let str = ''
	let DEF_ACTION = ''
	let DECLARE = ''
	let allArr = obj.pens || []
	let nodeList = allArr.filter(item=>item.type==0) || []
	let lines =  allArr.filter(item=>item.type==1) || []
	nodeList.forEach(item => {
		str += `NODE|${item.text}\n`
	});
	lines.forEach(item=>{
		let txt = item.text
		let arr=txt.includes("|")?txt.split("|"):[]
		let from = allArr.filter(it=>item.from.id==it.id)
		let to =  allArr.filter(it=>item.to.id==it.id)
		if(arr.length){
			  let remarkArr= dataListJson.filter(it=>it.name==arr[1])
			   DECLARE += `DECLARE|${arr[1]}|CUSTOM|${remarkArr.length?remarkArr[0].remark:''}\n`
			if(arr.length && arr[0] !="" &&  arr[0] !=''){
				str += `EDGE|${from[0]['text']}|${to[0]['text']}|${arr[0]}|none|this()|${arr.length?arr[1]:'none'}\n`
			}else {
			   DEF_ACTION += `DEF_ACTION|${from[0]['text']}|${arr[1]}\n`
			}
		}else {
			str += `EDGE|${from[0]['text']}|${to[0]['text']}|${item.text}|none|this()|none\n`
		}	
	})
	return `${str}${DEF_ACTION}${DECLARE}`
}
function getfnc(){
	let cFunctionUrl= `${fileUrl}/cFunction.json`
	let  checkDir = fs.existsSync(cFunctionUrl);	 
    if(checkDir){
   	 let cfnList = fs.readFileSync(cFunctionUrl, 'utf-8');
	   return JSON.parse(cfnList) 
     }else {
	   return []
	 }
}
//获取程文件
function getAll(level, dir) {
    var filesNameArr = []
	arrlistUrl=[]
    let cur = 0
    // 用个hash队列保存每个目录的深度
    var mapDeep = {}
    mapDeep[dir] = 0
    // 先遍历一遍给其建立深度索引
    function getMap(dir, curIndex) {
      var files = fs.readdirSync(dir) //同步拿到文件目录下的所有文件名
      files.map(function (file) {
        //var subPath = path.resolve(dir, file) //拼接为绝对路径
        var subPath = path.join(dir, file) //拼接为相对路径
        var stats = fs.statSync(subPath) //拿到文件信息对象
        // 必须过滤掉node_modules文件夹
        if (file != 'node_modules') {
          mapDeep[file] = curIndex + 1
          if (stats.isDirectory()) { //判断是否为文件夹类型
            return getMap(subPath, mapDeep[file]) //递归读取文件夹
          }
        }
      })
    }
    getMap(dir, mapDeep[dir])
    function readdirs(dir, folderName, myroot) {
      var result = { //构造文件夹数据
        path: dir,
        title: path.basename(dir),
        type: 'directory',
        deep: mapDeep[folderName]
      }
      var files = fs.readdirSync(dir) //同步拿到文件目录下的所有文件名
      result.children = files.map(function (file) {
        //var subPath = path.resolve(dir, file) //拼接为绝对路径
        var subPath = path.join(dir, file) //拼接为相对路径
        var stats = fs.statSync(subPath) //拿到文件信息对象
        if (stats.isDirectory()) { //判断是否为文件夹类型
          return readdirs(subPath, file, file) //递归读取文件夹
        }
	 	if(subPath.endsWith('.c')){
		   	arrlistUrl.push(subPath)
	  	}
     return { //构造文件数据
          path: subPath,
          name: file,
          type: 'file'
        }
      })
      return result //返回数据
    }
    filesNameArr.push(readdirs(dir, dir))
	// console.log(filesNameArr)
	// console.log(arrlistUrl)
    return filesNameArr
}
module.exports = {
	activate,
	deactivate
}
