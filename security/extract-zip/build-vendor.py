"""Reproduce the npm backport from pinned upstream bytes and reviewed pnpm patch."""
import base64,gzip,hashlib,io,pathlib,subprocess,tarfile,tempfile
root=pathlib.Path(__file__).resolve().parents[2]
source=root/'security/extract-zip/upstream-2.0.1.tgz'
assert base64.b64encode(hashlib.sha512(source.read_bytes()).digest()).decode()=='GDhU9ntwuKyGXdZBUgTIe+vXnWj0fppUEtMDL0+idd5Sta8TGpHssn/eusA9mrPr9qNDym6SxAYZjNvCn/9RBg=='
with tempfile.TemporaryDirectory() as tmp:
    directory=pathlib.Path(tmp)
    with tarfile.open(source) as archive:
        for entry in archive:
            assert entry.isfile() and entry.name.startswith('package/') and '..' not in pathlib.PurePosixPath(entry.name).parts
            target=directory/entry.name
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(archive.extractfile(entry).read())
            target.chmod(entry.mode)
    subprocess.run(['patch','-p1','--batch','-i',str(root/'patches/extract-zip@2.0.1.patch')],cwd=directory/'package',check=True)
    buf=io.BytesIO()
    with tarfile.open(fileobj=buf,mode='w',format=tarfile.USTAR_FORMAT) as archive:
        for file in sorted((directory/'package').iterdir()):
            data=file.read_bytes(); info=tarfile.TarInfo('package/'+file.name)
            info.size=len(data);info.mode=0o755 if file.name=='cli.js' else 0o644
            archive.addfile(info,io.BytesIO(data))
    output=root/'packages/huggingface-spaces/motion-ontology/vendor/extract-zip-2.0.1-backport.tgz'
    output.parent.mkdir(parents=True,exist_ok=True)
    compressed=io.BytesIO()
    with gzip.GzipFile(filename='',mode='wb',fileobj=compressed,mtime=0,compresslevel=9) as stream:
        stream.write(buf.getvalue())
    output.write_bytes(compressed.getvalue())
    print(hashlib.sha256(output.read_bytes()).hexdigest(),output)
