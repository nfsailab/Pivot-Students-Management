using System;
using System.Diagnostics;
using System.Threading;
using Microsoft.Win32;

class Program
{
    static bool isShuttingDown = false;

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
                Thread.Sleep(1000);
                if (!isShuttingDown)
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
                    Thread.Sleep(1000);
                    if (!isShuttingDown)
                    {
                        Process.Start(clientPath);
                    }
                }
                catch { }
            }
        }
    }
}
