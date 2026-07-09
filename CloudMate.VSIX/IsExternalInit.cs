// Required on .NET Framework targets (net472) to enable C# 9+ record types.
// The compiler looks for System.Runtime.CompilerServices.IsExternalInit and
// will not find it in the .NET Framework base class library; declaring it here
// as an internal type satisfies the compiler without runtime overhead.
namespace System.Runtime.CompilerServices;

internal static class IsExternalInit { }
