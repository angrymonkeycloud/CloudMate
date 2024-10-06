using System.IO.Compression;

namespace AngryMonkey.CloudMate;

public partial class CloudCompression
{
    public static Result Zip(IEnumerable<File> files)
    {
        using MemoryStream memoryStream = new();

        using (ZipArchive archive = new(memoryStream, ZipArchiveMode.Update, true))
        {
            foreach (File file in files)
            {
                ZipArchiveEntry entry = archive.CreateEntry(file.FileName, CompressionLevel.Fastest);

                using StreamWriter writer = new(entry.Open());

                writer.Write(file.Content);
            }
        }

        memoryStream.Seek(0, SeekOrigin.Begin);

        return new Result()
        {
            Content = memoryStream.ToArray(),
            ContentType = "application/zip"
        };
    }

    public class Result
    {
        public required byte[] Content { get; set; }
        public required string ContentType { get; set; }
    }
}