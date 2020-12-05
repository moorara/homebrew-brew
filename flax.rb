class Flax < Formula
  desc "Generate self-signed TLS/SSL certificates the easy way and pain-free"
  license "ISC"
  homepage "https://github.com/moorara/flax"
  url "https://github.com/moorara/flax.git",
    tag: "v0.1.3",
    revision: "b11591c8a7fed7f560fe74b395e26b210394aab0"
  head "https://github.com/moorara/flax.git",
    branch: "main"

  depends_on "go" => :build

  def install
    commit = `git rev-parse --short HEAD`
    go_version = `go version | grep -E -o '[0-9]+\.[0-9]+\.[0-9]+'`
    build_time = `date '+%Y-%m-%d %T %Z'`

    commit = commit.strip
    go_version = go_version.strip
    build_time = build_time.strip

    version_package = "github.com/moorara/flax/version"
    version_flag = "-X \"#{version_package}.Version=#{version}\""
    commit_flag = "-X \"#{version_package}.Commit=#{commit}\""
    branch_flag = "-X \"#{version_package}.Branch=main\""
    go_version_flag = "-X \"#{version_package}.GoVersion=#{go_version}\""
    build_tool_flag = "-X \"#{version_package}.BuildTool=Homebrew\""
    build_time_flag = "-X \"#{version_package}.BuildTime=#{build_time}\""
    ldflags = "#{version_flag} #{commit_flag} #{branch_flag} #{go_version_flag} #{build_tool_flag} #{build_time_flag}"

    system "go", "build", "-ldflags", ldflags, "-o", "flax"

    bin.install "flax"
    prefix.install_metafiles
  end

  test do
    system "#{bin}/flax", "-version"
  end
end
