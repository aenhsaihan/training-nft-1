import { AddCircleOutlined, Close } from '@mui/icons-material';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import {
  Box,
  Button,
  Stack,
  SwipeableDrawer,
  TextField,
  Toolbar,
  useMediaQuery,
} from '@mui/material';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useFormik } from 'formik';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';
import { TZIP21TokenMetadata, UserContext, UserContextType } from './App';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { address, bytes, nat } from './type-aliases';
import { char2Bytes } from '@taquito/utils';
import { TransactionInvalidBeaconError } from './TransactionInvalidBeaconError';

export default function MintPage() {
  const {
    userAddress,
    nftContratTokenMetadataMap,
    storage,
    refreshUserContextOnPageReload,
    nftContrat,
  } = React.useContext(UserContext) as UserContextType;

  const isTablet = useMediaQuery("(min-width:600px)");

  const validationSchema = yup.object({
    name: yup.string().required('Name is required'),
    description: yup.string().required('Description is required'),
    symbol: yup.string().required('Symbol is required'),
  });
  
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      token_id: 0,
      symbol: 'WINE',
    } as TZIP21TokenMetadata,
    validationSchema: validationSchema,
    onSubmit: (values) => {
      mint(values);
    },
  });

  const [pictureUrl, setPictureUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  //open mint drawer if admin
const [formOpen, setFormOpen] = useState<boolean>(false);

useEffect(() => {
  if (storage && storage.administrators.indexOf(userAddress! as address) < 0)
    setFormOpen(false);
  else setFormOpen(true);
}, [userAddress]);

const toggleDrawer =
  (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setFormOpen(open);
  };

  const { enqueueSnackbar } = useSnackbar();

const mint = async (newTokenDefinition: TZIP21TokenMetadata) => {
  try {
    //IPFS
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      const requestHeaders: HeadersInit = new Headers();
      requestHeaders.set(
        'pinata_api_key',
        `${import.meta.env.VITE_PINATA_API_KEY}`
      );
      requestHeaders.set(
        'pinata_secret_api_key',
        `${import.meta.env.VITE_PINATA_API_SECRET}`
      );

      const resFile = await fetch(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        {
          method: 'post',
          body: formData,
          headers: requestHeaders,
        }
      );

      const responseJson = await resFile.json();
      console.log('responseJson', responseJson);

      const thumbnailUri = `ipfs://${responseJson.IpfsHash}`;
      setPictureUrl(
        `https://gateway.pinata.cloud/ipfs/${responseJson.IpfsHash}`
      );

      const param1 = new BigNumber(newTokenDefinition.token_id) as nat;
      const param2 = char2Bytes(newTokenDefinition.name!) as bytes;
      const param3 = char2Bytes(newTokenDefinition.description!) as bytes;
      const param4 = char2Bytes(newTokenDefinition.symbol!) as bytes;
      const param5 = char2Bytes(thumbnailUri) as bytes;

      console.log(param1);
      console.log(param2);
      console.log(param3);
      console.log(param4);
      console.log(param5);

      const op = await nftContrat!.methods
        .mint(
          new BigNumber(newTokenDefinition.token_id) as nat,
          char2Bytes(newTokenDefinition.name!) as bytes,
          char2Bytes(newTokenDefinition.description!) as bytes,
          char2Bytes(newTokenDefinition.symbol!) as bytes,
          char2Bytes(thumbnailUri) as bytes
        )
        .send();

      //close directly the form
      setFormOpen(false);
      enqueueSnackbar(
        'Wine collection is minting ... it will be ready on next block, wait for the confirmation message before minting another collection',
        { variant: 'info' }
      );

      await op.confirmation(2);

      enqueueSnackbar('Wine collection minted', { variant: 'success' });

      refreshUserContextOnPageReload(); //force all app to refresh the context
    }
  } catch (error) {
    console.table(`Error: ${JSON.stringify(error, null, 2)}`);
    let tibe: TransactionInvalidBeaconError =
      new TransactionInvalidBeaconError(error);
    enqueueSnackbar(tibe.data_message, {
      variant: 'error',
      autoHideDuration: 10000,
    });
  }
};

useEffect(() => {
  (async () => {
    if (nftContratTokenMetadataMap && nftContratTokenMetadataMap.size > 0) {
      formik.setFieldValue('token_id', nftContratTokenMetadataMap.size);
    }
  })();
}, [nftContratTokenMetadataMap?.size]);

  return (
    <Paper>

  {storage ? (
    <Button
      disabled={storage.administrators.indexOf(userAddress! as address) < 0}
      sx={{
        p: 1,
        position: "absolute",
        right: "0",
        display: formOpen ? "none" : "block",
        zIndex: 1,
      }}
      onClick={toggleDrawer(!formOpen)}
    >
      {" Mint Form " +
        (storage!.administrators.indexOf(userAddress! as address) < 0
          ? " (You are not admin)"
          : "")}
      <OpenWithIcon />
    </Button>
  ) : (
    ""
  )}

  <SwipeableDrawer
    onClose={toggleDrawer(false)}
    onOpen={toggleDrawer(true)}
    anchor="right"
    open={formOpen}
    variant="temporary"
  >
    <Toolbar
      sx={
        isTablet
          ? { marginTop: "0", marginRight: "0" }
          : { marginTop: "35px", marginRight: "125px" }
      }
    />
    <Box
      sx={{
        width: isTablet ? "40vw" : "60vw",
        borderColor: "text.secondary",
        borderStyle: "solid",
        borderWidth: "1px",

        height: "calc(100vh - 64px)",
      }}
    >
      <Button
        sx={{
          position: "absolute",
          right: "0",
          display: !formOpen ? "none" : "block",
        }}
        onClick={toggleDrawer(!formOpen)}
      >
        <Close />
      </Button>
      <form onSubmit={formik.handleSubmit}>
        <Stack spacing={2} margin={2} alignContent={"center"}>
          <Typography variant="h5">Mint a new collection</Typography>

          <TextField
            id="standard-basic"
            name="token_id"
            label="token_id"
            value={formik.values.token_id}
            disabled
            variant="filled"
          />
          <TextField
            id="standard-basic"
            name="name"
            label="name"
            required
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            variant="filled"
          />
          <TextField
            id="standard-basic"
            name="symbol"
            label="symbol"
            required
            value={formik.values.symbol}
            onChange={formik.handleChange}
            error={formik.touched.symbol && Boolean(formik.errors.symbol)}
            helperText={formik.touched.symbol && formik.errors.symbol}
            variant="filled"
          />
          <TextField
            id="standard-basic"
            name="description"
            label="description"
            required
            multiline
            minRows={2}
            value={formik.values.description}
            onChange={formik.handleChange}
            error={
              formik.touched.description &&
              Boolean(formik.errors.description)
            }
            helperText={
              formik.touched.description && formik.errors.description
            }
            variant="filled"
          />

          {pictureUrl ? (
            <img height={100} width={100} src={pictureUrl} />
          ) : (
            ""
          )}
          <Button variant="contained" component="label" color="primary">
            <AddCircleOutlined />
            Upload an image
            <input
              type="file"
              hidden
              name="data"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const data = e.target.files ? e.target.files[0] : null;
                if (data) {
                  setFile(data);
                }
                e.preventDefault();
              }}
            />
          </Button>

          <Button variant="contained" type="submit">
            Mint
          </Button>
        </Stack>
      </form>
    </Box>
  </SwipeableDrawer>


  <Typography variant="h5">Mint your wine collection</Typography>

  {nftContratTokenMetadataMap.size != 0 ? (
    "//TODO"
  ) : (
    <Typography sx={{ py: "2em" }} variant="h4">
      Sorry, there is not NFT yet, you need to mint bottles first
    </Typography>
  )}
</Paper>
  );
}
