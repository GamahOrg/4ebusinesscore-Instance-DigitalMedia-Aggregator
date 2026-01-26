// Configures Windows Communication Foundation 3.5 for WebMatrix
// 
// Usage: 
//    WCF35Setup.js [un]install

function WCFHandler(name, path, mode, bitness)
{
    this._name = name;
    this._path = path;
    this._mode = mode;
    this._bitness = bitness;
}

var moduleName = "ServiceModel";

var wcfHandlers = new Array( new WCFHandler("svc-Integrated", "*.svc", "integrated", null),
                             new WCFHandler("rules-Integrated", "*.rules", "integrated", null),
                             new WCFHandler("xoml-Integrated", "*.xoml", "integrated", null),

                             new WCFHandler("svc-ISAPI-2.0", "*.svc", "classic", "x86"),
                             new WCFHandler("rules-ISAPI-2.0", "*.rules", "classic", "x86"),
                             new WCFHandler("xoml-ISAPI-2.0", "*.xoml", "classic", "x86"),

                             new WCFHandler("svc-ISAPI-2.0-64", "*.svc", "classic", "x64"),
                             new WCFHandler("rules-64-ISAPI-2.0", "*.rules", "classic", "x64"),
                             new WCFHandler("xoml-64-ISAPI-2.0", "*.xoml", "classic", "x64"));

//
// main start
//
try { 
    var mode = ParseArguments();
    if (mode == "install")
    {
        UninstallWCF();
        InstallWCF(); 
        WScript.Echo("WCF 3.5 has been configured for IIS Express.");
    }
    else if (mode == "uninstall")
    {
        UninstallWCF();
        WScript.Echo("WCF 3.5 has been uninstalled from IIS Express.");
    }
    else
    {
        PrintUsage();
    }
} 
catch(e) { 
    WScript.Echo("An error occurred:\r\n " + e.description); 
} 
//
// main end
//

function InstallWCF() { 
    var adminManager = GetAdminManager(); 
 
    AddModule(adminManager);
    AddHandlers(adminManager);
 
    adminManager.CommitChanges(); 
} 

function UninstallWCF() {
    var adminManager = GetAdminManager(); 
    var moduleSection = adminManager.GetAdminSection("system.webServer/modules", "MACHINE/WEBROOT/APPHOST");

    var modulePosition = FindElement(moduleSection.Collection, "add", ["name", moduleName]); 
    if (modulePosition != -1) 
    {
      moduleSection.Collection.DeleteElement(modulePosition); 
    }

    var handlerSection = adminManager.GetAdminSection("system.webServer/handlers", "MACHINE/WEBROOT/APPHOST");

    for (i = 0; i < wcfHandlers.length; i++)
    {
        var svcPosition = FindElement(handlerSection.Collection, "add", ["name", wcfHandlers[i]._name]); 
        if (svcPosition != -1) 
        {
          handlerSection.Collection.DeleteElement(svcPosition); 
        }
    }
    
    adminManager.CommitChanges(); 
}

function AddModule(adminManager)
{
    var moduleSection = adminManager.GetAdminSection("system.webServer/modules", "MACHINE/WEBROOT/APPHOST");
    var element = moduleSection.Collection.CreateNewElement("add"); 

    element.Properties.Item("name").Value = moduleName; 
    element.Properties.Item("type").Value = "System.ServiceModel.Activation.HttpModule, System.ServiceModel, Version=3.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089";
    element.Properties.Item("preCondition").Value = "managedHandler,runtimeVersionv2.0";

    moduleSection.Collection.AddElement(element, -1); 
}

function AddHandlers(adminManager)
{
    var handlerSection = adminManager.GetAdminSection("system.webServer/handlers", "MACHINE/WEBROOT/APPHOST");

    for (var i = 0; i < wcfHandlers.length; i++) 
    {
        if (wcfHandlers[i]._mode == "integrated") 
        {
            AddIntegratedHandler(handlerSection, wcfHandlers[i]._name, wcfHandlers[i]._path);
        }
        else if (wcfHandlers[i]._mode == "classic") 
        {
            AddISAPIHandler(handlerSection, wcfHandlers[i]._name, wcfHandlers[i]._path, wcfHandlers[i]._bitness );
        }
        else 
        {
            throw new Error("Unrecognized mode [" + wcfHandlers[i]._mode + "]");
        }
    }
}

function AddIntegratedHandler(section, name, path)
{
    var element = section.Collection.CreateNewElement("add"); 
    element.Properties.Item("name").Value = name; 
    element.Properties.Item("path").Value = path; 
    element.Properties.Item("verb").Value = "*"; 
    element.Properties.Item("type").Value = "System.ServiceModel.Activation.HttpHandler, System.ServiceModel, Version=3.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089";
    element.Properties.Item("preCondition").Value = "integratedMode,runtimeVersionv2.0"; 
    section.Collection.AddElement(element, 0); 
}

function AddISAPIHandler(section, name, path, bitness)
{
    var element = section.Collection.CreateNewElement("add");
    var scriptProcessor = null;
    var preCondition = null;

    if (bitness == "x86") 
    {
        scriptProcessor = "%SystemRoot%\\Microsoft.NET\\Framework\\v2.0.50727\\aspnet_isapi.dll";
        preCondition = "classicMode,runtimeVersionv2.0,bitness32"; 
    }
    else if (bitness == "x64") 
    {
        scriptProcessor = "%SystemRoot%\\Microsoft.NET\\Framework64\\v2.0.50727\\aspnet_isapi.dll";
        preCondition = "classicMode,runtimeVersionv2.0,bitness64"; 
    }
    else 
    {
        throw new Error("Unrecognized bitness [" + bitness + "]");
    }

    element.Properties.Item("name").Value = name; 
    element.Properties.Item("path").Value = path; 
    element.Properties.Item("verb").Value = "*"; 
    element.Properties.Item("modules").Value = "IsapiModule";
    element.Properties.Item("scriptProcessor").Value = scriptProcessor;
    element.Properties.Item("preCondition").Value = preCondition;

    section.Collection.AddElement(element, 0); 
}

function GetAdminManager()
{
    try
    {
        var vermg = new ActiveXObject("Microsoft.IIS.VersionManager");
        var exp = vermg.GetVersionObject("10.0", 1);
        return adminManager = exp.CreateObjectFromProgId("Microsoft.ApplicationHost.WritableAdminManager");
    }
    catch(e)
    {
        throw new Error("Unable to create WritableAdminManager.\r\n Please ensure that IIS Express is installed properly.\r\n\r\n  " + e.description);
    }
}

function FindElement(collection, elementTagName, valuesToMatch) 
{ 
    for (var i = 0; i < collection.Count; i++) 
    { 
        var element = collection.Item(i); 
         
        if (element.Name == elementTagName) 
        { 
            var matches = true; 
            for (var iVal = 0; iVal < valuesToMatch.length; iVal += 2) 
            { 
                var property = element.GetPropertyByName(valuesToMatch[iVal]); 
                var value = property.Value; 
                if (value != null) 
                { 
                    value = value.toString(); 
                } 
                if (value != valuesToMatch[iVal + 1]) 
                { 
                    matches = false; 
                    break; 
                } 
            } 
            if (matches) 
            { 
                return i; 
            } 
        } 
    } 
     
    return -1; 
}

function ParseArguments()
{
    var mode = "";
    
    if (WScript.Arguments.Count() > 0)
    {
        if (WScript.Arguments.Item(0).toLowerCase() == "install")
        {
            mode="install";
        }
        else if (WScript.Arguments.Item(0).toLowerCase() == "uninstall")
        {
            mode="uninstall";
        }
    }
    
    return mode;
}

function PrintUsage()
{
    WScript.Echo("Usage:\r\n   WCF35Setup.js <cmd>\r\n\r\nDescription:\r\nAdministration utility that enables configuation of WCF 3.5 for IIS Express\r\n\r\nSupported Commands:\r\n install, uninstall\r\n\r\nSamples:\r\n WCF35Setup.js install\r\n WCF35Setup.js uninstall");
}

// SIG // Begin signature block
// SIG // MIIoNwYJKoZIhvcNAQcCoIIoKDCCKCQCAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // OD1vCYheGCdl6arpIJqkPQYAKVOaKwcTFIztf40VGuKg
// SIG // gg2FMIIGAzCCA+ugAwIBAgITMwAABAO91ZVdDzsYrQAA
// SIG // AAAEAzANBgkqhkiG9w0BAQsFADB+MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBT
// SIG // aWduaW5nIFBDQSAyMDExMB4XDTI0MDkxMjIwMTExM1oX
// SIG // DTI1MDkxMTIwMTExM1owdDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEeMBwGA1UEAxMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
// SIG // n3RnXcCDp20WFMoNNzt4s9fV12T5roRJlv+bshDfvJoM
// SIG // ZfhyRnixgUfGAbrRlS1St/EcXFXD2MhRkF3CnMYIoeMO
// SIG // MuMyYtxr2sC2B5bDRMUMM/r9I4GP2nowUthCWKFIS1RP
// SIG // lM0YoVfKKMaH7bJii29sW+waBUulAKN2c+Gn5znaiOxR
// SIG // qIu4OL8f9DCHYpME5+Teek3SL95sH5GQhZq7CqTdM0fB
// SIG // w/FmLLx98SpBu7v8XapoTz6jJpyNozhcP/59mi/Fu4tT
// SIG // 2rI2vD50Vx/0GlR9DNZ2py/iyPU7DG/3p1n1zluuRp3u
// SIG // XKjDfVKH7xDbXcMBJid22a3CPbuC2QJLowIDAQABo4IB
// SIG // gjCCAX4wHwYDVR0lBBgwFgYKKwYBBAGCN0wIAQYIKwYB
// SIG // BQUHAwMwHQYDVR0OBBYEFOpuKgJKc+OuNYitoqxfHlrE
// SIG // gXAZMFQGA1UdEQRNMEukSTBHMS0wKwYDVQQLEyRNaWNy
// SIG // b3NvZnQgSXJlbGFuZCBPcGVyYXRpb25zIExpbWl0ZWQx
// SIG // FjAUBgNVBAUTDTIzMDAxMis1MDI5MjYwHwYDVR0jBBgw
// SIG // FoAUSG5k5VAF04KqFzc3IrVtqMp1ApUwVAYDVR0fBE0w
// SIG // SzBJoEegRYZDaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
// SIG // L3BraW9wcy9jcmwvTWljQ29kU2lnUENBMjAxMV8yMDEx
// SIG // LTA3LTA4LmNybDBhBggrBgEFBQcBAQRVMFMwUQYIKwYB
// SIG // BQUHMAKGRWh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9w
// SIG // a2lvcHMvY2VydHMvTWljQ29kU2lnUENBMjAxMV8yMDEx
// SIG // LTA3LTA4LmNydDAMBgNVHRMBAf8EAjAAMA0GCSqGSIb3
// SIG // DQEBCwUAA4ICAQBRaP+hOC1+dSKhbqCr1LIvNEMrRiOQ
// SIG // EkPc7D6QWtM+/IbrYiXesNeeCZHCMf3+6xASuDYQ+AyB
// SIG // TX0YlXSOxGnBLOzgEukBxezbfnhUTTk7YB2/TxMUcuBC
// SIG // P45zMM0CVTaJE8btloB6/3wbFrOhvQHCILx41jTd6kUq
// SIG // 4bIBHah3NG0Q1H/FCCwHRGTjAbyiwq5n/pCTxLz5XYCu
// SIG // 4RTvy/ZJnFXuuwZynowyju90muegCToTOwpHgE6yRcTv
// SIG // Ri16LKCr68Ab8p8QINfFvqWoEwJCXn853rlkpp4k7qzw
// SIG // lBNiZ71uw2pbzjQzrRtNbCFQAfmoTtsHFD2tmZvQIg1Q
// SIG // VkzM/V1KCjHL54ItqKm7Ay4WyvqWK0VIEaTbdMtbMWbF
// SIG // zq2hkRfJTNnFr7RJFeVC/k0DNaab+bpwx5FvCUvkJ3z2
// SIG // wfHWVUckZjEOGmP7cecefrF+rHpif/xW4nJUjMUiPsyD
// SIG // btY2Hq3VMLgovj+qe0pkJgpYQzPukPm7RNhbabFNFvq+
// SIG // kXWBX/z/pyuo9qLZfTb697Vi7vll5s/DBjPtfMpyfpWG
// SIG // 0phVnAI+0mM4gH09LCMJUERZMgu9bbCGVIQR7cT5YhlL
// SIG // t+tpSDtC6XtAzq4PJbKZxFjpB5wk+SRJ1gm87olbfEV9
// SIG // SFdO7iL3jWbjgVi1Qs1iYxBmvh4WhLWr48uouzCCB3ow
// SIG // ggVioAMCAQICCmEOkNIAAAAAAAMwDQYJKoZIhvcNAQEL
// SIG // BQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNo
// SIG // aW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQK
// SIG // ExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xMjAwBgNVBAMT
// SIG // KU1pY3Jvc29mdCBSb290IENlcnRpZmljYXRlIEF1dGhv
// SIG // cml0eSAyMDExMB4XDTExMDcwODIwNTkwOVoXDTI2MDcw
// SIG // ODIxMDkwOVowfjELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEoMCYG
// SIG // A1UEAxMfTWljcm9zb2Z0IENvZGUgU2lnbmluZyBQQ0Eg
// SIG // MjAxMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoC
// SIG // ggIBAKvw+nIQHC6t2G6qghBNNLrytlghn0IbKmvpWlCq
// SIG // uAY4GgRJun/DDB7dN2vGEtgL8DjCmQawyDnVARQxQtOJ
// SIG // DXlkh36UYCRsr55JnOloXtLfm1OyCizDr9mpK656Ca/X
// SIG // llnKYBoF6WZ26DJSJhIv56sIUM+zRLdd2MQuA3WraPPL
// SIG // bfM6XKEW9Ea64DhkrG5kNXimoGMPLdNAk/jj3gcN1Vx5
// SIG // pUkp5w2+oBN3vpQ97/vjK1oQH01WKKJ6cuASOrdJXtjt
// SIG // 7UORg9l7snuGG9k+sYxd6IlPhBryoS9Z5JA7La4zWMW3
// SIG // Pv4y07MDPbGyr5I4ftKdgCz1TlaRITUlwzluZH9TupwP
// SIG // rRkjhMv0ugOGjfdf8NBSv4yUh7zAIXQlXxgotswnKDgl
// SIG // mDlKNs98sZKuHCOnqWbsYR9q4ShJnV+I4iVd0yFLPlLE
// SIG // tVc/JAPw0XpbL9Uj43BdD1FGd7P4AOG8rAKCX9vAFbO9
// SIG // G9RVS+c5oQ/pI0m8GLhEfEXkwcNyeuBy5yTfv0aZxe/C
// SIG // HFfbg43sTUkwp6uO3+xbn6/83bBm4sGXgXvt1u1L50kp
// SIG // pxMopqd9Z4DmimJ4X7IvhNdXnFy/dygo8e1twyiPLI9A
// SIG // N0/B4YVEicQJTMXUpUMvdJX3bvh4IFgsE11glZo+TzOE
// SIG // 2rCIF96eTvSWsLxGoGyY0uDWiIwLAgMBAAGjggHtMIIB
// SIG // 6TAQBgkrBgEEAYI3FQEEAwIBADAdBgNVHQ4EFgQUSG5k
// SIG // 5VAF04KqFzc3IrVtqMp1ApUwGQYJKwYBBAGCNxQCBAwe
// SIG // CgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8GA1UdEwEB
// SIG // /wQFMAMBAf8wHwYDVR0jBBgwFoAUci06AjGQQ7kUBU7h
// SIG // 6qfHMdEjiTQwWgYDVR0fBFMwUTBPoE2gS4ZJaHR0cDov
// SIG // L2NybC5taWNyb3NvZnQuY29tL3BraS9jcmwvcHJvZHVj
// SIG // dHMvTWljUm9vQ2VyQXV0MjAxMV8yMDExXzAzXzIyLmNy
// SIG // bDBeBggrBgEFBQcBAQRSMFAwTgYIKwYBBQUHMAKGQmh0
// SIG // dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2kvY2VydHMv
// SIG // TWljUm9vQ2VyQXV0MjAxMV8yMDExXzAzXzIyLmNydDCB
// SIG // nwYDVR0gBIGXMIGUMIGRBgkrBgEEAYI3LgMwgYMwPwYI
// SIG // KwYBBQUHAgEWM2h0dHA6Ly93d3cubWljcm9zb2Z0LmNv
// SIG // bS9wa2lvcHMvZG9jcy9wcmltYXJ5Y3BzLmh0bTBABggr
// SIG // BgEFBQcCAjA0HjIgHQBMAGUAZwBhAGwAXwBwAG8AbABp
// SIG // AGMAeQBfAHMAdABhAHQAZQBtAGUAbgB0AC4gHTANBgkq
// SIG // hkiG9w0BAQsFAAOCAgEAZ/KGpZjgVHkaLtPYdGcimwuW
// SIG // EeFjkplCln3SeQyQwWVfLiw++MNy0W2D/r4/6ArKO79H
// SIG // qaPzadtjvyI1pZddZYSQfYtGUFXYDJJ80hpLHPM8QotS
// SIG // 0LD9a+M+By4pm+Y9G6XUtR13lDni6WTJRD14eiPzE32m
// SIG // kHSDjfTLJgJGKsKKELukqQUMm+1o+mgulaAqPyprWElj
// SIG // HwlpblqYluSD9MCP80Yr3vw70L01724lruWvJ+3Q3fMO
// SIG // r5kol5hNDj0L8giJ1h/DMhji8MUtzluetEk5CsYKwsat
// SIG // ruWy2dsViFFFWDgycScaf7H0J/jeLDogaZiyWYlobm+n
// SIG // t3TDQAUGpgEqKD6CPxNNZgvAs0314Y9/HG8VfUWnduVA
// SIG // KmWjw11SYobDHWM2l4bf2vP48hahmifhzaWX0O5dY0Hj
// SIG // Wwechz4GdwbRBrF1HxS+YWG18NzGGwS+30HHDiju3mUv
// SIG // 7Jf2oVyW2ADWoUa9WfOXpQlLSBCZgB/QACnFsZulP0V3
// SIG // HjXG0qKin3p6IvpIlR+r+0cjgPWe+L9rt0uX4ut1eBrs
// SIG // 6jeZeRhL/9azI2h15q/6/IvrC4DqaTuv/DDtBEyO3991
// SIG // bWORPdGdVk5Pv4BXIqF4ETIheu9BCrE/+6jMpF3BoYib
// SIG // V3FWTkhFwELJm3ZbCoBIa/15n8G9bW1qyVJzEw16UM0x
// SIG // ghoKMIIaBgIBATCBlTB+MQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBTaWduaW5n
// SIG // IFBDQSAyMDExAhMzAAAEA73VlV0POxitAAAAAAQDMA0G
// SIG // CWCGSAFlAwQCAQUAoIGuMBkGCSqGSIb3DQEJAzEMBgor
// SIG // BgEEAYI3AgEEMBwGCisGAQQBgjcCAQsxDjAMBgorBgEE
// SIG // AYI3AgEVMC8GCSqGSIb3DQEJBDEiBCBVAPv0SXvQ0SNb
// SIG // ruRbN9BLXkIauejgJH20xBS9fuWMeTBCBgorBgEEAYI3
// SIG // AgEMMTQwMqAUgBIATQBpAGMAcgBvAHMAbwBmAHShGoAY
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tMA0GCSqGSIb3
// SIG // DQEBAQUABIIBAIU5aAg8ne2hR5y56jx1Bn1z9Axbb4KE
// SIG // 9XXWKNldmo7l6h0LVcuzMjgwICxqWPUKRP9QREgS2DtL
// SIG // WOPOGtS1NOJzNn01XRjPxHU7+lADAhusNPDvn00oR9kg
// SIG // tFZ4cEEva26BoAY77zJtDKz/XtH6DvLszLSZetSdZfzT
// SIG // 4xAPugFZoiGDXELDXQaG7JUmBhqCe5GfHvWNn/EH9/ab
// SIG // vvBI7JTH47JB6c6Z0BMcOYjEgd4YDIld4E9PgWYEeP7m
// SIG // yBBDwx73OzMhCVf+dLUqjO0TjU89v1LZR+suNhSpXlJ4
// SIG // fvEHfgBONGDzJjKNJ7r/c9voiOOGiayDYbq3uYEoz+mk
// SIG // 2qqhgheUMIIXkAYKKwYBBAGCNwMDATGCF4Awghd8Bgkq
// SIG // hkiG9w0BBwKgghdtMIIXaQIBAzEPMA0GCWCGSAFlAwQC
// SIG // AQUAMIIBUgYLKoZIhvcNAQkQAQSgggFBBIIBPTCCATkC
// SIG // AQEGCisGAQQBhFkKAwEwMTANBglghkgBZQMEAgEFAAQg
// SIG // GXgWygfw8IxbezBYk/OVf8t9k60UKE0UJC0VdAGpZhsC
// SIG // BmeSNlDMwhgTMjAyNTAyMDcwMjE0NDguMDQ4WjAEgAIB
// SIG // 9KCB0aSBzjCByzELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMG
// SIG // A1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9u
// SIG // czEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNOOjMzMDMt
// SIG // MDVFMC1EOTQ3MSUwIwYDVQQDExxNaWNyb3NvZnQgVGlt
// SIG // ZS1TdGFtcCBTZXJ2aWNloIIR6jCCByAwggUIoAMCAQIC
// SIG // EzMAAAHm2UKe6gD4feEAAQAAAeYwDQYJKoZIhvcNAQEL
// SIG // BQAwfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hp
// SIG // bmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoT
// SIG // FU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMd
// SIG // TWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTAwHhcN
// SIG // MjMxMjA2MTg0NTE1WhcNMjUwMzA1MTg0NTE1WjCByzEL
// SIG // MAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
// SIG // EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
// SIG // c29mdCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9z
// SIG // b2Z0IEFtZXJpY2EgT3BlcmF0aW9uczEnMCUGA1UECxMe
// SIG // blNoaWVsZCBUU1MgRVNOOjMzMDMtMDVFMC1EOTQ3MSUw
// SIG // IwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2
// SIG // aWNlMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKC
// SIG // AgEAvb6YfOLYJbhM5v8KTSpQI3BJRs35bygA2dQ/tnf4
// SIG // nmGBLRdhyjKyhhQzi6S1lhuQxMoim5WCqxNp7eeNDhrt
// SIG // +WcdIFyQRNM1mp2RAIwo7eHhgYvrmpGbJO9Mx00Bx8nz
// SIG // /gd5tgUkjRT4YLFSD6er6P/bejnjXsyMF+ROflcBBt+5
// SIG // 2YBHsUBdn0GWG8UNQGrqg70XV7EqStXYdVAbfRGjLM7r
// SIG // nGkeZzMEDerA4xvfRc3SvQLc25+EppbKC1LUQIf++vLC
// SIG // ndGNYTJilR8CF/P+CblEVAUWdCVrtDWEAafJIZLtfEPA
// SIG // gEOdNLRQe1R96Q/M6AOJXAOyZMUxqDyq7n5vpUWQAOIj
// SIG // IG3C2dj/8UnZyhcVPLy99UaDZWSYhi+TKk1778gS8/jE
// SIG // T+BJ/TcntTfMf5SQ9bLXTaOcCRvpoF7BP8384NhmlakH
// SIG // MxR4NDZfG6SKpzRVEXkEatwtY1WDAknHoDcx3mLcOTpm
// SIG // f+3lZ0Zo15QrC73bMTs3NWFZ+p2S5EA+ct9R2KwfYiB7
// SIG // rMIWjL9oSTTY1Z3ZKVsvd+DyGblkzJN+tJI1zxcJdlr9
// SIG // U85vbTqwqvPpeNPCiC+ifnn6BjZEfGAdzPrtbWHlQzv0
// SIG // 3Dmxh8WhhQekGcQFKZ3weTfzJgTcTDqsxtTfEIsFvILY
// SIG // 4zCYhQX+omGKwo7UcBeyD3UCxbUCAwEAAaOCAUkwggFF
// SIG // MB0GA1UdDgQWBBTlBDF57TeePtdWTPkLu0Oa4NxXPTAf
// SIG // BgNVHSMEGDAWgBSfpxVdAF5iXYP05dJlpxtTNRnpcjBf
// SIG // BgNVHR8EWDBWMFSgUqBQhk5odHRwOi8vd3d3Lm1pY3Jv
// SIG // c29mdC5jb20vcGtpb3BzL2NybC9NaWNyb3NvZnQlMjBU
// SIG // aW1lLVN0YW1wJTIwUENBJTIwMjAxMCgxKS5jcmwwbAYI
// SIG // KwYBBQUHAQEEYDBeMFwGCCsGAQUFBzAChlBodHRwOi8v
// SIG // d3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NlcnRzL01p
// SIG // Y3Jvc29mdCUyMFRpbWUtU3RhbXAlMjBQQ0ElMjAyMDEw
// SIG // KDEpLmNydDAMBgNVHRMBAf8EAjAAMBYGA1UdJQEB/wQM
// SIG // MAoGCCsGAQUFBwMIMA4GA1UdDwEB/wQEAwIHgDANBgkq
// SIG // hkiG9w0BAQsFAAOCAgEAYW7qIE2qUbLsEpGhTEOncrvG
// SIG // QmFKVkPIiK24uNLVNoSuqR4LtIY9M//cxUUceQ34bpI7
// SIG // 24wP3UuVWH8c9RCGz5bfPezCdrARjtmC2MGHpXyaQ8Gw
// SIG // dF0vWZK6qc6ul/5Zg0A59xub3GKWEAieeSy78hZSdfeQ
// SIG // FaOFsvFF+ae4PVtzIDR0DKTPhFeuPnLM4+B6OWkJnihr
// SIG // Ssu8O9nkWP71g7qba7867hTZigiLddlHAOQTrF6dT7ZI
// SIG // 8dskbAo++w0ppdM1WI6lvyElpKxo8nlSfpIc3LcWi5JJ
// SIG // VcAsYoKJA+n5Fm8tIQhCkzkzzM4boDyAHMXB7EdrMdNW
// SIG // EWvaR9s73XbLgRH0hRugo9EErxGfzPZifoeJomkEkewB
// SIG // G1Rg28kSpGJ/NEvtwJkZYd2TnvgRaieezl3XiA0h27x8
// SIG // ye6E6hvPepd3lIT7GYOvXzYMU8Zb0TZkRP/utWI+2dbg
// SIG // dF2ED+tK7DC3U5VWBMmVJeTC0y+S76haM2ZUtl6I4uAR
// SIG // D+nXVU85hyeKHTmTFk03kNCMJ1hvfL1r/66D3oAq9Rut
// SIG // RVa3VyxNwFyH7eGTeGZA056AIT8Ow2TT0ZUluE21Y/y8
// SIG // NF75y2DcDFAPaLmP8MfbXk2ifL05G4GMmjmChc+qzUV2
// SIG // eGn+ntyF8DAn3wmrKSlFwu9mDLuVvC/88k8bDVBIAW0w
// SIG // ggdxMIIFWaADAgECAhMzAAAAFcXna54Cm0mZAAAAAAAV
// SIG // MA0GCSqGSIb3DQEBCwUAMIGIMQswCQYDVQQGEwJVUzET
// SIG // MBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVk
// SIG // bW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
// SIG // aW9uMTIwMAYDVQQDEylNaWNyb3NvZnQgUm9vdCBDZXJ0
// SIG // aWZpY2F0ZSBBdXRob3JpdHkgMjAxMDAeFw0yMTA5MzAx
// SIG // ODIyMjVaFw0zMDA5MzAxODMyMjVaMHwxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1l
// SIG // LVN0YW1wIFBDQSAyMDEwMIICIjANBgkqhkiG9w0BAQEF
// SIG // AAOCAg8AMIICCgKCAgEA5OGmTOe0ciELeaLL1yR5vQ7V
// SIG // gtP97pwHB9KpbE51yMo1V/YBf2xK4OK9uT4XYDP/XE/H
// SIG // ZveVU3Fa4n5KWv64NmeFRiMMtY0Tz3cywBAY6GB9alKD
// SIG // RLemjkZrBxTzxXb1hlDcwUTIcVxRMTegCjhuje3XD9gm
// SIG // U3w5YQJ6xKr9cmmvHaus9ja+NSZk2pg7uhp7M62AW36M
// SIG // EBydUv626GIl3GoPz130/o5Tz9bshVZN7928jaTjkY+y
// SIG // OSxRnOlwaQ3KNi1wjjHINSi947SHJMPgyY9+tVSP3PoF
// SIG // VZhtaDuaRr3tpK56KTesy+uDRedGbsoy1cCGMFxPLOJi
// SIG // ss254o2I5JasAUq7vnGpF1tnYN74kpEeHT39IM9zfUGa
// SIG // RnXNxF803RKJ1v2lIH1+/NmeRd+2ci/bfV+Autuqfjbs
// SIG // Nkz2K26oElHovwUDo9Fzpk03dJQcNIIP8BDyt0cY7afo
// SIG // mXw/TNuvXsLz1dhzPUNOwTM5TI4CvEJoLhDqhFFG4tG9
// SIG // ahhaYQFzymeiXtcodgLiMxhy16cg8ML6EgrXY28MyTZk
// SIG // i1ugpoMhXV8wdJGUlNi5UPkLiWHzNgY1GIRH29wb0f2y
// SIG // 1BzFa/ZcUlFdEtsluq9QBXpsxREdcu+N+VLEhReTwDwV
// SIG // 2xo3xwgVGD94q0W29R6HXtqPnhZyacaue7e3PmriLq0C
// SIG // AwEAAaOCAd0wggHZMBIGCSsGAQQBgjcVAQQFAgMBAAEw
// SIG // IwYJKwYBBAGCNxUCBBYEFCqnUv5kxJq+gpE8RjUpzxD/
// SIG // LwTuMB0GA1UdDgQWBBSfpxVdAF5iXYP05dJlpxtTNRnp
// SIG // cjBcBgNVHSAEVTBTMFEGDCsGAQQBgjdMg30BATBBMD8G
// SIG // CCsGAQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jvc29mdC5j
// SIG // b20vcGtpb3BzL0RvY3MvUmVwb3NpdG9yeS5odG0wEwYD
// SIG // VR0lBAwwCgYIKwYBBQUHAwgwGQYJKwYBBAGCNxQCBAwe
// SIG // CgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8GA1UdEwEB
// SIG // /wQFMAMBAf8wHwYDVR0jBBgwFoAU1fZWy4/oolxiaNE9
// SIG // lJBb186aGMQwVgYDVR0fBE8wTTBLoEmgR4ZFaHR0cDov
// SIG // L2NybC5taWNyb3NvZnQuY29tL3BraS9jcmwvcHJvZHVj
// SIG // dHMvTWljUm9vQ2VyQXV0XzIwMTAtMDYtMjMuY3JsMFoG
// SIG // CCsGAQUFBwEBBE4wTDBKBggrBgEFBQcwAoY+aHR0cDov
// SIG // L3d3dy5taWNyb3NvZnQuY29tL3BraS9jZXJ0cy9NaWNS
// SIG // b29DZXJBdXRfMjAxMC0wNi0yMy5jcnQwDQYJKoZIhvcN
// SIG // AQELBQADggIBAJ1VffwqreEsH2cBMSRb4Z5yS/ypb+pc
// SIG // FLY+TkdkeLEGk5c9MTO1OdfCcTY/2mRsfNB1OW27DzHk
// SIG // wo/7bNGhlBgi7ulmZzpTTd2YurYeeNg2LpypglYAA7AF
// SIG // vonoaeC6Ce5732pvvinLbtg/SHUB2RjebYIM9W0jVOR4
// SIG // U3UkV7ndn/OOPcbzaN9l9qRWqveVtihVJ9AkvUCgvxm2
// SIG // EhIRXT0n4ECWOKz3+SmJw7wXsFSFQrP8DJ6LGYnn8Atq
// SIG // gcKBGUIZUnWKNsIdw2FzLixre24/LAl4FOmRsqlb30mj
// SIG // dAy87JGA0j3mSj5mO0+7hvoyGtmW9I/2kQH2zsZ0/fZM
// SIG // cm8Qq3UwxTSwethQ/gpY3UA8x1RtnWN0SCyxTkctwRQE
// SIG // cb9k+SS+c23Kjgm9swFXSVRk2XPXfx5bRAGOWhmRaw2f
// SIG // pCjcZxkoJLo4S5pu+yFUa2pFEUep8beuyOiJXk+d0tBM
// SIG // drVXVAmxaQFEfnyhYWxz/gq77EFmPWn9y8FBSX5+k77L
// SIG // +DvktxW/tM4+pTFRhLy/AsGConsXHRWJjXD+57XQKBqJ
// SIG // C4822rpM+Zv/Cuk0+CQ1ZyvgDbjmjJnW4SLq8CdCPSWU
// SIG // 5nR0W2rRnj7tfqAxM328y+l7vzhwRNGQ8cirOoo6CGJ/
// SIG // 2XBjU02N7oJtpQUQwXEGahC0HVUzWLOhcGbyoYIDTTCC
// SIG // AjUCAQEwgfmhgdGkgc4wgcsxCzAJBgNVBAYTAlVTMRMw
// SIG // EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
// SIG // b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRp
// SIG // b24xJTAjBgNVBAsTHE1pY3Jvc29mdCBBbWVyaWNhIE9w
// SIG // ZXJhdGlvbnMxJzAlBgNVBAsTHm5TaGllbGQgVFNTIEVT
// SIG // TjozMzAzLTA1RTAtRDk0NzElMCMGA1UEAxMcTWljcm9z
// SIG // b2Z0IFRpbWUtU3RhbXAgU2VydmljZaIjCgEBMAcGBSsO
// SIG // AwIaAxUA4ljQXhSfY72hKzeuA9RvOni9JruggYMwgYCk
// SIG // fjB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1N
// SIG // aWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDANBgkq
// SIG // hkiG9w0BAQsFAAIFAOtP0UowIhgPMjAyNTAyMDcwMDI0
// SIG // NDJaGA8yMDI1MDIwODAwMjQ0MlowdDA6BgorBgEEAYRZ
// SIG // CgQBMSwwKjAKAgUA60/RSgIBADAHAgEAAgIUUDAHAgEA
// SIG // AgISjDAKAgUA61EiygIBADA2BgorBgEEAYRZCgQCMSgw
// SIG // JjAMBgorBgEEAYRZCgMCoAowCAIBAAIDB6EgoQowCAIB
// SIG // AAIDAYagMA0GCSqGSIb3DQEBCwUAA4IBAQAHjOIbQk3V
// SIG // ZvDZ1BN05EA0ajT1W7QJtHqBdztggMfP0DvP52w9CBFv
// SIG // ezG+T+NtiMJMjB+C6ZWQno053ZpOFQPWUz9wkAS22hBN
// SIG // lbBvODN/v2mTypDg+g5urLtxG0n9SAfosXRZip8M4l0u
// SIG // n+Xwa3dwqtC4s7vXdmFYfrkAb0LQxamWWkjPKGzLPqI6
// SIG // sZu1gmBeq5nTKmHmnEUoD+OO9x05WhjjfU3UvA6FFSEp
// SIG // LoCvJasFglPv67VXuSJoZuI49Wg+h8ELCV/aFb0QEk+3
// SIG // YUniazCSk04I4d8ZId0TZtKR1Ui/yf1Xa2QndO554LSQ
// SIG // ziNrPk5Rp563F9kJgS7qwHFlMYIEDTCCBAkCAQEwgZMw
// SIG // fDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0
// SIG // b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1p
// SIG // Y3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWlj
// SIG // cm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAHm
// SIG // 2UKe6gD4feEAAQAAAeYwDQYJYIZIAWUDBAIBBQCgggFK
// SIG // MBoGCSqGSIb3DQEJAzENBgsqhkiG9w0BCRABBDAvBgkq
// SIG // hkiG9w0BCQQxIgQgcfJklfxcaovLsvo9ey7EIWOa7oWk
// SIG // cpCYGp0DLiktO1QwgfoGCyqGSIb3DQEJEAIvMYHqMIHn
// SIG // MIHkMIG9BCDPu6OGqB6zCWhvIJyztateoSGHEZ6MuhZz
// SIG // gm50g9LGWTCBmDCBgKR+MHwxCzAJBgNVBAYTAlVTMRMw
// SIG // EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
// SIG // b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRp
// SIG // b24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1w
// SIG // IFBDQSAyMDEwAhMzAAAB5tlCnuoA+H3hAAEAAAHmMCIE
// SIG // IKelq71zSDwxs3BsGIiEP0wi08p0nDAU1h3gzBAMVxvQ
// SIG // MA0GCSqGSIb3DQEBCwUABIICABQZ/iGF+D2VQQRG1LRJ
// SIG // LPurFYARq2DMfiwUluiyIT8xaUwichqZt1oBB//a47oS
// SIG // 1UGVAfETMwgMxlhMrjm1MmLKgf4I5ZqsPV+Um5UXQEvJ
// SIG // zRHNgmcUaqPbM1cJn+wrnQiCeOgqfKV0vQIqrIJso3Y2
// SIG // LQQTlE6euaGh0BrWfWATIXmhY8HRhAtAky0W+ACGnAkD
// SIG // IFN1GzZ75n5SpcLMbcDR6Dkp0UAUdpncdHRJbdp0sE9P
// SIG // p4d9iL+E/vyxle+Kgzb+jJ0gVpDB2nI7K+tC8c10Rusg
// SIG // rCGjMIaZx62K4F0uOVzaAqok2nUTRzRbIom4gncsm6Uh
// SIG // 5AWbJXhcueSWKCvtTSdGgMPNzy0Kx/ywR4fuj7T4bX37
// SIG // SsQh6DNTFPjm1gKcSNf6sL9jaC/bEnSzH10MJyOrZ0yr
// SIG // ZAnxoW4+xRZtWgmeGXbY8SO4hWbTQVI0pCVuT/TIGCkc
// SIG // 2/0ryGfiEgjj3GSvweyaVxFKx7yJDlZO9cGePDtq+0is
// SIG // SKpB808cgumVp/ZagmxERmhHOdCGERJcqdhi7oBiA53p
// SIG // 8Do3/gjduwZvhRFVSEjE7oGTvIwex8lmv6hwvakSW3PV
// SIG // 1HtmcI22FUNe5+VOEZIL4tEWyeyrN8xtDLtHMOtnTlh1
// SIG // SnCoIx78aUXy3eKxr0XA9rnCebEpR/Ze170QfyCsDw6x
// SIG // 8OUa
// SIG // End signature block
