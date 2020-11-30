class Changelog < Formula
  desc "The Simple Changelog Generator"
  license "ISC"
  homepage "https://github.com/moorara/changelog"
  url "https://github.com/moorara/changelog.git",
    tag: "v0.1.3",
    revision: "b0acc8479e24ae7605101ca41baa56ff3faa0fd8"
  head "https://github.com/moorara/changelog.git",
    branch: "main"

  depends_on "go" => :build

  def install
    commit = `git rev-parse --short HEAD`
    go_version = `go version | grep -E -o '[0-9]+\.[0-9]+\.[0-9]+'`
    build_time = `date '+%Y-%m-%d %T %Z'`

    commit = commit.strip
    go_version = go_version.strip
    build_time = build_time.strip

    version_package = "github.com/moorara/changelog/version"
    version_flag = "-X \"#{version_package}.Version=#{version}\""
    commit_flag = "-X \"#{version_package}.Commit=#{commit}\""
    branch_flag = "-X \"#{version_package}.Branch=main\""
    go_version_flag = "-X \"#{version_package}.GoVersion=#{go_version}\""
    build_tool_flag = "-X \"#{version_package}.BuildTool=Homebrew\""
    build_time_flag = "-X \"#{version_package}.BuildTime=#{build_time}\""
    ldflags = "#{version_flag} #{commit_flag} #{branch_flag} #{go_version_flag} #{build_tool_flag} #{build_time_flag}"

    system "go", "build", "-ldflags", ldflags, "./cmd/changelog"

    bin.install "changelog"
    prefix.install_metafiles
  end

  test do
    system "#{bin}/changelog", "-version"
  end
end
