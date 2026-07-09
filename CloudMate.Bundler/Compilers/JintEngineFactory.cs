using Jint;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Creates Jint engines pre-configured with the minimal host shims the embedded compilers expect
/// (console, timers, self). Individual compilers add their own specific shims on top.
/// </summary>
internal static class JintEngineFactory
{
    /// <summary>Optional sink for console output produced by the embedded compilers.</summary>
    public static Action<string>? ConsoleOutput { get; set; }

    public static Engine Create()
    {
        Engine engine = new();

        Action<object?> write = message => ConsoleOutput?.Invoke(message?.ToString() ?? string.Empty);

        engine.SetValue("__cloudmate_console_write", write);

        engine.Execute(
            """
            var console = {
                log: __cloudmate_console_write,
                info: __cloudmate_console_write,
                debug: __cloudmate_console_write,
                warn: __cloudmate_console_write,
                error: __cloudmate_console_write,
                trace: __cloudmate_console_write
            };

            function setTimeout(callback) { if (typeof callback === 'function') callback(); return 0; }
            function clearTimeout(id) { }
            function setInterval(callback) { return 0; }
            function clearInterval(id) { }

            var self = globalThis;
            """);

        return engine;
    }
}
