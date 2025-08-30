# Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. **Stream Loading but Nothing Happens**

**Symptoms:**
- Stream appears to load (loading indicator shows)
- No video playback
- No error messages
- Works locally but fails on Vercel

**Causes:**
- FFmpeg not available in Vercel's serverless environment
- Serverless function timeouts
- Memory limitations
- Process spawning restrictions

**Solutions Applied:**
- ✅ Added fallback streaming route (`/api/stream-fallback`)
- ✅ Optimized FFmpeg settings for serverless (ultrafast preset, higher CRF)
- ✅ Added comprehensive logging and error handling
- ✅ Implemented timeout handling and fallback logic
- ✅ Added Vercel-specific headers and optimizations

### 2. **FFmpeg Binary Issues**

**Problem:** FFmpeg binary not found or not executable in Vercel

**Solutions:**
1. **Use @ffmpeg-installer/ffmpeg package** (already implemented)
2. **Set FFMPEG_PATH environment variable** in Vercel dashboard
3. **Fallback to direct streaming** when transcoding fails

**Environment Variable Setup:**
```bash
# In Vercel dashboard > Settings > Environment Variables
FFMPEG_PATH=/opt/ffmpeg/ffmpeg
```

### 3. **Serverless Function Limitations**

**Vercel Limits:**
- **Timeout**: 10 seconds (Hobby), 60 seconds (Pro), 900 seconds (Enterprise)
- **Memory**: 1024 MB (Hobby), 3008 MB (Pro), 3008 MB (Enterprise)
- **CPU**: Limited in serverless environment

**Optimizations Applied:**
- ✅ Reduced video quality (CRF 28 instead of 23)
- ✅ Use ultrafast preset for faster encoding
- ✅ Lower audio bitrate (96k instead of 128k)
- ✅ Added process timeouts
- ✅ Implemented fallback streaming

### 4. **Streaming Headers and CORS**

**Issues:**
- Buffering problems
- CORS errors
- Cache issues

**Solutions Applied:**
- ✅ Added `X-Accel-Buffering: no` header
- ✅ Proper CORS headers
- ✅ Cache control headers
- ✅ Transfer-Encoding: chunked

## Testing and Debugging

### 1. **Health Check Endpoint**
Visit `/api/health` to check:
- Environment status
- FFmpeg availability
- Vercel configuration
- Platform information

### 2. **FFmpeg Test Endpoint**
Visit `/api/transcode/test` to verify:
- FFmpeg installation
- Binary path
- Version information
- Codec support

### 3. **Console Logging**
Check Vercel function logs for:
- `[TRANSCODE]` messages
- `[STREAM-FALLBACK]` messages
- `[PLAYER]` messages
- Error details and stack traces

## Deployment Checklist

### Before Deploying:
- [ ] All dependencies installed (`npm install`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] FFmpeg package included in dependencies
- [ ] Environment variables configured in Vercel

### After Deploying:
- [ ] Check `/api/health` endpoint
- [ ] Test `/api/transcode/test` endpoint
- [ ] Monitor function logs for errors
- [ ] Test video playback with different formats

## Alternative Solutions

### 1. **Direct Streaming (Recommended for Vercel)**
- Use `/api/stream-fallback` route
- Bypasses FFmpeg transcoding
- Works with browser-compatible formats
- Faster and more reliable

### 2. **External Transcoding Service**
- Use services like Cloudflare Stream
- AWS MediaConvert
- Google Cloud Video Intelligence
- More reliable but requires setup

### 3. **Client-Side Transcoding**
- Use WebAssembly-based FFmpeg
- Transcode in browser
- More CPU intensive but works everywhere
- Requires additional packages

## Performance Optimization

### 1. **Video Quality Settings**
```bash
# Current settings (optimized for Vercel)
-preset ultrafast  # Fastest encoding
-crf 28            # Lower quality, faster encoding
-b:a 96k           # Lower audio bitrate
```

### 2. **Memory Management**
- Monitor function memory usage
- Use streaming responses
- Implement proper cleanup
- Add timeouts to prevent hanging

### 3. **Caching Strategy**
- Cache provider responses
- Cache FFmpeg binary path
- Implement request deduplication
- Use appropriate cache headers

## Monitoring and Alerts

### 1. **Vercel Analytics**
- Monitor function execution times
- Track error rates
- Monitor memory usage
- Set up alerts for failures

### 2. **Custom Logging**
- Log all transcoding attempts
- Track success/failure rates
- Monitor fallback usage
- Log performance metrics

### 3. **Error Tracking**
- Capture detailed error information
- Track user agent and platform
- Monitor specific video formats
- Alert on repeated failures

## Support and Resources

### 1. **Vercel Documentation**
- [Serverless Functions](https://vercel.com/docs/functions)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Function Logs](https://vercel.com/docs/functions/logs)

### 2. **FFmpeg Resources**
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Codec Compatibility](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [Serverless Deployment](https://ffmpeg.org/platform.html)

### 3. **Community Support**
- Vercel Community Discord
- GitHub Issues
- Stack Overflow
- FFmpeg Mailing List
