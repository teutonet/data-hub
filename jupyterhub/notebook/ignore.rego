package trivy

default ignore = false

ignore {
    input.PkgName == "linux-libc-dev"
}
