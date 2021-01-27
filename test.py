# coding=UTF-8
#!/usr/bin/python 
import paramiko
import threading
import time
import sys
# 复制文件
def scp(pol, ip, username, passwd,fileUrl,fileName, cmd):
    try:   
      # 实例化一个trans对象# 实例化一个transport对象
      trans = paramiko.Transport((ip, pol))
      # 建立连接
      trans.connect(username=username, password=passwd)
      
      # 实例化一个 sftp对象,指定连接的通道
      sftp = paramiko.SFTPClient.from_transport(trans)
      # 发送文件
      sftp.put(localpath=fileUrl, remotepath=fileName)
      # 下载文件
      # sftp.get(remotepath, localpath)
      trans.close()
      print('transfer successful')
    except:
        print('Transfer failed')
#登录后执行脚本       
def ssh(port, ip, username, passwd, cmd):
    try:
        #初始化paramiko.client类
        ssh = paramiko.SSHClient()
        #set_missing_host_key_policy:当SSH服务器的主机名不在系统主机密钥或应用程序的密钥中时，应使用该策略
        #AutoAddPolicy():自动将主机名和新主机密钥添加到本地HostKeys对象并保存它
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        #连接到SSH服务器并对其进行身份验证,port默认为22
        ssh.connect(ip, port, username, passwd, timeout=5)
        # # 遍历要执行的命令
        for i in cmd:
            stdin, stdout, stderr = ssh.exec_command(i)
            #读取执行命令后输出的内容
            out = stdout.readlines()
            for m in out:
                print(m)
        print('Successful implementation')
    except:
        print('00000')


if __name__ == '__main__':
    gpus = sys.argv
    # 用户名
    username =  gpus[1]
    # 密码
    passwd =  gpus[2]
    # 多线程
    threads = []
    print('begin....')
    ip=  gpus[3]
    fileUrl =  gpus[4]
    fileName = gpus[5]
    arr1 = gpus[4].split(',')
    arr2 = gpus[5].split(',')
    mainpyUrl = gpus[6]
    tarGetUrl = gpus[7]
    newFileUrl = gpus[8]

    #端口列表
    ports = [22]
    pol= 22
    delO = 'rm -rf  {delio}/lib.o {delio}/user_def_rule.a'.format(delio= tarGetUrl)
    delNigel = 'rm -rf  {delmI}'.format(delmI= newFileUrl)
    createFlie = 'mkdir {delm}'.format(delm= newFileUrl)
    print(createFlie)
    print(delNigel)
    cmdDel= [delO,delNigel,createFlie]
    print(delO)
    ssh(pol, ip, username, passwd, cmdDel)
    for i in range(len(arr1)):
        scp( pol, ip, username, passwd,arr1[i],arr2[i], i)
        print(i,arr1[i],arr2[i])
    #这个循环根据需求自定义
    print(mainpyUrl)
    print(arr2)
    cmds = "bash -lc 'python3 {mainpy}/main.py {fsm} {config}'".format(mainpy= mainpyUrl, fsm=arr2[2],config=arr2[3] )
    print(cmds)
    # 执行命令的列表集
    cmd = [cmds]
    print(cmd)
    for port in ports:
        port = port
        ip =  sys.argv[3]
        # 多线程  要执行的函数（参数）
        a = threading.Thread(target=ssh, args=(port, ip, username, passwd, cmd))
        a.start()