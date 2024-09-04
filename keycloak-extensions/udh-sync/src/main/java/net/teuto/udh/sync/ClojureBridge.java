package net.teuto.udh.sync;

import clojure.java.api.Clojure;
import clojure.lang.IFn;

public class ClojureBridge {

    private static final String KEYCLOAK_NS = "net.teuto.udh.sync.keycloak";
    private static final String REPL_NS = "net.teuto.udh.sync.repl";

    static {
        IFn require = Clojure.var("clojure.core", "require");
        require.invoke(Clojure.read(REPL_NS));
        Clojure.var(REPL_NS, "start-repl").invoke();

        require.invoke(Clojure.read(KEYCLOAK_NS));
    }

    public static IFn setClaim = Clojure.var(KEYCLOAK_NS, "set-claim");
    public static IFn onEvent = Clojure.var(KEYCLOAK_NS, "on-event");
    public static IFn handleApiRequest = Clojure.var(KEYCLOAK_NS, "handle-api-request");
    public static IFn evaluatePolicy = Clojure.var(KEYCLOAK_NS, "evaluate-policy");
    public static IFn init = Clojure.var(KEYCLOAK_NS, "init");
}
