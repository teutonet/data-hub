<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" class="${properties.kcHtmlClass!}">

    <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="robots" content="noindex, nofollow">
        <#if properties.meta?has_content>
            <#list properties.meta?split(' ') as meta>
                <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
            </#list>
        </#if>
        <title>Login DataHub</title>
        <#if properties.stylesCommon?has_content>
            <#list properties.stylesCommon?split(' ') as style>
                <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
            </#list>
        </#if>
        <#if properties.styles?has_content>
            <#list properties.styles?split(' ') as style>
                <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
            </#list>
        </#if>
        <#if properties.scripts?has_content>
            <#list properties.scripts?split(' ') as script>
                <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
            </#list>
        </#if>
        <#if scripts??>
            <#list scripts as script>
                <script src="${script}" type="text/javascript"></script>
            </#list>
        </#if>
    </head>

    <body class="${properties.kcBodyClass!}">
        <div class="${properties.kcLoginClass!}">
            <div id="kc-header" class="${properties.kcHeaderClass!}">
                <div id="kc-header-wrapper" class="${properties.kcHeaderWrapperClass!}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 22"><g fill="currentColor"><path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375S7.03 1.5 12 1.5s9 2.183 9 4.875"/><path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.3 8.3 0 0 0 1.897-1.384q.024.182.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875q0-.186.025-.368a8.3 8.3 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75"/><path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.3 8.3 0 0 0 1.897-1.384q.024.182.025.368c0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875q0-.186.025-.368a8.3 8.3 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5"/><path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.3 8.3 0 0 0 1.897-1.384q.024.182.025.368c0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875q0-.186.025-.368a8.3 8.3 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25"/></g></svg>
                    DataHub
                </div>
            </div>
            <div class="diagonal-background-2">
                <div class="diagonal-background">
                    <div class="login-content">
                        <div class="${properties.kcFormCardClass!}">
                            <header class="${properties.kcFormHeaderClass!}">
                                <#if realm.internationalizationEnabled  && locale.supported?size gt 1>
                                    <div id="kc-locale">
                                        <div id="kc-locale-wrapper" class="${properties.kcLocaleWrapperClass!}">
                                            <div class="kc-dropdown" id="kc-locale-dropdown">
                                                <a href="#" id="kc-current-locale-link">${locale.current}</a>
                                                <ul>
                                                    <#list locale.supported as l>
                                                        <li class="kc-dropdown-item"><a href="${l.url}">${l.label}</a></li>
                                                    </#list>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </#if>
                                <h1 id="kc-page-title"><#nested "header"></h1>
                            </header>
                            <div id="kc-content">
                                <div id="kc-content-wrapper">

                                    <#if displayMessage && message?has_content>
                                        <div class="alert alert-${message.type}">
                                            <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                                            <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                                            <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                                            <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                                            <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                                        </div>
                                    </#if>

                                    <#nested "form">

                                    <#if displayInfo>
                                        <div id="kc-info" class="${properties.kcSignUpClass!}">
                                            <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                                                <#nested "info">
                                            </div>
                                        </div>
                                    </#if>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    </body>
</html>
</#macro>
