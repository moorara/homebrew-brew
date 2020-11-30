class Gelato < Formula
  desc "An opinionated application tool and framework for Go"
  license "ISC"
  homepage "https://github.com/moorara/gelato"
  url "https://github.com/moorara/gelato.git",
    tag: "v0.1.3",
    revision: "4913b9f92ab20a03fea85a517555aacd3e3ef110"
  head "https://github.com/moorara/gelato.git",
    branch: "main"

  depends_on "go" => :build

  def install
    commit = `git rev-parse --short HEAD`
    go_version = `go version | grep -E -o '[0-9]+\.[0-9]+\.[0-9]+'`
    build_time = `date '+%Y-%m-%d %T %Z'`

    commit = commit.strip
    go_version = go_version.strip
    build_time = build_time.strip

    version_package = "github.com/moorara/gelato/version"
    version_flag = "-X \"#{version_package}.Version=#{version}\""
    commit_flag = "-X \"#{version_package}.Commit=#{commit}\""
    branch_flag = "-X \"#{version_package}.Branch=main\""
    go_version_flag = "-X \"#{version_package}.GoVersion=#{go_version}\""
    build_tool_flag = "-X \"#{version_package}.BuildTool=Homebrew\""
    build_time_flag = "-X \"#{version_package}.BuildTime=#{build_time}\""
    ldflags = "#{version_flag} #{commit_flag} #{branch_flag} #{go_version_flag} #{build_tool_flag} #{build_time_flag}"

    system "go", "build", "-ldflags", ldflags, "./cmd/gelato"

    bin.install "gelato"
    prefix.install_metafiles
  end

  test do
    system "#{bin}/gelato", "-version"
  end
end
