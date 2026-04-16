using System.Runtime.InteropServices;
using System.Text;

namespace AngryMonkey.CloudMate;

public static class ConsoleHelper
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetConsoleOutputCP(uint wCodePageID);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetConsoleCP(uint wCodePageID);

    public static void EnsureConsoleSetup()
    {
        try
        {
            SetConsoleOutputCP(65001);
            SetConsoleCP(65001);
            Console.OutputEncoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
            Console.InputEncoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        }
        catch
        {
            // Fallback: best-effort encoding setup
        }
    }
}