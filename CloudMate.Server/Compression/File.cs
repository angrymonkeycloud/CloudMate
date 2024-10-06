using System.Text;

namespace AngryMonkey.CloudMate;

public partial class CloudCompression
{
    public record File
    {
        public File(string fileName, object content)
        {
            FileName = fileName;
            Content = content;
            IsBytes = Content.GetType().IsAssignableFrom(typeof(byte[]));
        }

        public File(string fileName, string content)
        {
            FileName = fileName;
            Content = content;
            IsBytes = false;
        }

        public File(string fileName, byte[] content)
        {
            FileName = fileName;
            Content = content;
            IsBytes = true;
        }

        public bool IsBytes { get; set; }

        public readonly string FileName;
        public readonly object Content;

        public byte[] AsBytes => IsBytes ? (byte[])Content : Encoding.UTF8.GetBytes(Content.ToString());

        public int ContentLength => IsBytes ? ((byte[])Content).Length : Content.ToString()?.Length ?? 0;
    }
}