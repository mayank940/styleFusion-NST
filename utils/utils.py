from torch.utils.data import Dataset
import os
from PIL import Image
from PIL.Image import DecompressionBombError
from torchvision import transforms

class ImageFilesDataset(Dataset):

    def __init__(self, root, transform = None):
        super(ImageFilesDataset, self).__init__()
        self.root = root
        self.transform = transform

        filenames = list(os.listdir(root))
        self.filenames = []

        for filename in filenames:
            img_path = os.path.join(self.root, filename)
            try:
                with Image.open(img_path) as img:
                    height, width = img.size
                    size = height * width
                    if size <= 178_956_970:
                        self.filenames.append(filename)
            except DecompressionBombError as e:
                continue
            except Exception as e:
                print(e)

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        image_path = os.path.join(self.root, self.filenames[idx])
        image = Image.open(image_path).convert("RGB")

        if self.transform:
            image = self.transform(image)
        return image


def get_transform(size, crop, final_size):
    transform_list = []

    if size > 0:
        transform_list.append(transforms.Resize(size))
    if crop:
        transform_list.append(transforms.RandomCrop(size))
    else:
        transform_list.append(transforms.Resize(final_size))

    transform_list.append(transforms.ToTensor())
    return transforms.Compose(transform_list)

def adaIn_normalization(c_feat, s_feat):
    size = c_feat.size()
    c_mean, c_std = calc_mean_std(c_feat)
    s_mean, s_std = calc_mean_std(s_feat)

    norm_c_feat = (c_feat - c_mean.expand(size)) / c_std.expand(size)

    return norm_c_feat * s_std.expand(size) + s_mean.expand(size)

def calc_mean_std(feat, eps=1e-5):
    size = feat.size()
    batch_size, channels = size[:2]

    feat_mean = feat.view(batch_size, channels, -1).mean(dim=2).view(batch_size, channels, 1, 1)
    feat_var = feat.view(batch_size, channels, -1).var(dim=2, unbiased=False) + eps
    feat_std = feat_var.sqrt().view(batch_size, channels, 1, 1)

    return feat_mean, feat_std