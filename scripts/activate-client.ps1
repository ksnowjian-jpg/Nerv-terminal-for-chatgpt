function Start-StoreThemeClient {
  param([Parameter(Mandatory=$true)][string]$AppId, [Parameter(Mandatory=$true)][int]$Port)
  if (-not ('ThemeEngine.StoreActivation' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace ThemeEngine {
  [ComImport, Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAppActivation {
    [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string appId, [MarshalAs(UnmanagedType.LPWStr)] string args, uint options, out uint processId);
    [PreserveSig] int ActivateForFile([MarshalAs(UnmanagedType.LPWStr)] string appId, IntPtr items, [MarshalAs(UnmanagedType.LPWStr)] string verb, out uint processId);
    [PreserveSig] int ActivateForProtocol([MarshalAs(UnmanagedType.LPWStr)] string appId, IntPtr items, out uint processId);
  }
  public static class StoreActivation {
    [DllImport("ole32.dll", ExactSpelling=true)]
    static extern int CoCreateInstance(ref Guid clsid, IntPtr outer, uint context, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object instance);
    public static uint Launch(string appId, string args) {
      Guid clsid = new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C");
      Guid iid = typeof(IAppActivation).GUID;
      object instance;
      Marshal.ThrowExceptionForHR(CoCreateInstance(ref clsid, IntPtr.Zero, 4, ref iid, out instance));
      try {
        uint appProcessId;
        Marshal.ThrowExceptionForHR(((IAppActivation)instance).ActivateApplication(appId, args, 0, out appProcessId));
        return appProcessId;
      } finally { Marshal.FinalReleaseComObject(instance); }
    }
  }
}
'@
  }
  [ThemeEngine.StoreActivation]::Launch($AppId, "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$Port")
}
