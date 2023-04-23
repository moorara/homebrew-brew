class Gocert < Formula
  desc "Generate self-signed TLS/SSL certificates the easy way and pain-free"
  license "ISC"
  homepage "https://github.com/moorara/gocert"
  url "https://github.com/moorara/gocert.git",
    tag: "v0.1.8",
    revision: "54db22d2bbf0fc39113861d8c705cabd9ccc2ec3"
  head "https://github.com/moorara/gocert.git",
    branch: "main"

  depends_on "go" => :build

  def install
    commit = `git rev-parse --short HEAD`
    go_version = `go version | grep -E -o '[0-9]+\.[0-9]+\.[0-9]+'`
    build_time = `date '+%Y-%m-%d %T %Z'`

    commit = commit.strip
    go_version = go_version.strip
    build_time = build_time.strip

    version_package = "github.com/moorara/gocert/version"
    version_flag = "-X \"#{version_package}.Version=#{version}\""
    commit_flag = "-X \"#{version_package}.Commit=#{commit}\""
    branch_flag = "-X \"#{version_package}.Branch=main\""
    go_version_flag = "-X \"#{version_package}.GoVersion=#{go_version}\""
    build_tool_flag = "-X \"#{version_package}.BuildTool=Homebrew\""
    build_time_flag = "-X \"#{version_package}.BuildTime=#{build_time}\""
    ldflags = "#{version_flag} #{commit_flag} #{branch_flag} #{go_version_flag} #{build_tool_flag} #{build_time_flag}"

    system "go", "build", "-ldflags", ldflags, "-o", "gocert"

    bin.install "gocert"
    prefix.install_metafiles
  end

  test do
    system "#{bin}/gocert", "-version"
  end
end
