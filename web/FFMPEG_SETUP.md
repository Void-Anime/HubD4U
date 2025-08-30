# FFmpeg Setup Guide

## Overview
This application uses FFmpeg for transcoding video files that aren't natively supported by browsers (like MKV, HEVC, etc.) into browser-compatible MP4 format.

## Installation

### Automatic Installation (Recommended)
The app automatically installs FFmpeg via `@ffmpeg-installer/ffmpeg` package. This should work out of the box.

### Manual Installation
If automatic installation fails, you can manually install FFmpeg:

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your PATH environment variable
4. Or set `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe` in your environment

#### macOS
```bash
# Using Homebrew
brew install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

## Environment Variables

You can set these environment variables to override automatic detection:

```bash
# Set custom FFmpeg path
FFMPEG_PATH=/path/to/ffmpeg

# Example for Windows
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

## Testing FFmpeg

Visit `/api/transcode/test` to check if FFmpeg is working properly. This endpoint will:

1. Check if FFmpeg is available
2. Verify the binary path
3. Test FFmpeg version
4. Confirm codec support

## Troubleshooting

### Common Issues

1. **"FFmpeg not available" error**
   - Check if FFmpeg is installed
   - Verify PATH environment variable
   - Try setting `FFMPEG_PATH` explicitly

2. **"spawn ENOENT" error**
   - FFmpeg binary not found at expected path
   - Check file permissions
   - Verify binary is executable

3. **Transcoding fails**
   - Check FFmpeg supports required codecs (libx264, aac)
   - Verify input URL is accessible
   - Check server logs for detailed error messages

4. **Memory issues**
   - Large video files may cause memory problems
   - Consider using lower quality presets
   - Monitor server memory usage

### Debug Mode

Enable debug logging by checking the server console. The transcoding route logs:
- FFmpeg path being used
- Command arguments
- Process events (start, exit, error)
- Stream handling events

### Performance Optimization

For better performance:
- Use `-preset veryfast` (already configured)
- Consider `-crf 28` for lower quality but faster encoding
- Monitor CPU usage during transcoding
- Use hardware acceleration if available (`-hwaccel auto`)

## Codec Support

The transcoding route is configured to output:
- **Video**: H.264 (libx264) with baseline profile
- **Audio**: AAC at 128kbps
- **Container**: MP4 with fast start flags

This ensures maximum browser compatibility while maintaining reasonable quality.

## Security Notes

- Only HTTPS URLs are accepted for input
- Input validation prevents path traversal attacks
- Process isolation prevents command injection
- Timeout handling prevents hanging processes
