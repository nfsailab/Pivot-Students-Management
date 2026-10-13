using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using Microsoft.Win32;

class Program
{
    static bool isShuttingDown = false;

    static bool IsClientAlreadyRunning(string clientPath, int exitedPid)
    {
        try
        {
            string procName = Path.GetFileNameWithoutExtension(clientPath);
            Process[] running = Process.GetProcessesByName(procName);
            foreach (Process p in running)
            {
                try
                {
                    if (p.Id != exitedPid && !p.HasExited)
                    {
                        return true;
                    }
                }
                catch { }
            }
        }
        catch { }
        return false;
    }

    static void Main(string[] args)
    {
        if (args.Length < 2) return;
        
        int parentPid;
        if (!int.TryParse(args[0], out parentPid)) return;
        
        string clientPath = args[1];

        // Listen for logoff/shutdown events to prevent restarting during PC shutdown
        SystemEvents.SessionEnding += (sender, e) => {
            isShuttingDown = true;
        };

        try
        {
            Process parentProcess = Process.GetProcessById(parentPid);
            parentProcess.WaitForExit();

            if (!isShuttingDown)
            {
                Thread.Sleep(1500);
                if (!isShuttingDown && !IsClientAlreadyRunning(clientPath, parentPid))
                {
                    Process.Start(clientPath);
                }
            }
        }
        catch (Exception)
        {
            if (!isShuttingDown)
            {
                try
                {
                    Thread.Sleep(1500);
                    if (!isShuttingDown && !IsClientAlreadyRunning(clientPath, parentPid))
                    {
                        Process.Start(clientPath);
                    }
                }
                catch { }
            }
        }
    }
}
